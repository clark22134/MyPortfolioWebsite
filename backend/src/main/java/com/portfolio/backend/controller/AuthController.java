package com.portfolio.backend.controller;

import com.portfolio.backend.dto.LoginRequest;
import com.portfolio.backend.dto.LoginResponse;
import com.portfolio.backend.dto.RegisterRequest;
import com.portfolio.backend.entity.RefreshToken;
import com.portfolio.backend.entity.User;
import com.portfolio.backend.security.CookieUtil;
import com.portfolio.backend.security.JwtUtil;
import com.portfolio.backend.security.RateLimitingService;
import com.portfolio.backend.service.AuthService;
import com.portfolio.backend.service.CustomUserDetailsService;
import com.portfolio.backend.service.RefreshTokenService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    @Autowired
    private AuthService authService;
    
    @Autowired
    private RateLimitingService rateLimitingService;
    
    @Autowired
    private JwtUtil jwtUtil;
    
    @Autowired
    private CookieUtil cookieUtil;
    
    @Autowired
    private RefreshTokenService refreshTokenService;
    
    @Autowired
    private CustomUserDetailsService userDetailsService;
    
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, 
                                   HttpServletRequest httpRequest,
                                   HttpServletResponse httpResponse) {
        String clientIp = getClientIp(httpRequest);
        String rateLimitKey = clientIp + ":" + request.getUsername();
        
        // Check if rate limited
        if (rateLimitingService.isRateLimited(rateLimitKey)) {
            long secondsUntilUnlock = rateLimitingService.getSecondsUntilUnlock(rateLimitKey);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of(
                            "error", "Too many failed login attempts",
                            "message", "Account temporarily locked. Try again in " + (secondsUntilUnlock / 60) + " minutes.",
                            "retryAfterSeconds", secondsUntilUnlock
                    ));
        }
        
        try {
            LoginResponse response = authService.login(request);
            // Clear failed attempts on successful login
            rateLimitingService.clearAttempts(rateLimitKey);
            
            // Generate access token (short-lived, 15 min)
            UserDetails userDetails = userDetailsService.loadUserByUsername(request.getUsername());
            String accessToken = jwtUtil.generateAccessToken(userDetails);
            
            // Create refresh token and store in database
            User user = authService.findByUsername(request.getUsername());
            String userAgent = httpRequest.getHeader("User-Agent");
            RefreshToken refreshToken = refreshTokenService.createRefreshToken(user, userAgent, clientIp);
            
            // Set tokens in HTTP-only cookies
            Cookie accessCookie = cookieUtil.createAccessTokenCookie(accessToken);
            Cookie refreshCookie = cookieUtil.createRefreshTokenCookie(refreshToken.getToken());
            
            // Add cookies with SameSite=Strict for CSRF protection
            cookieUtil.addCookieWithSameSite(httpResponse, accessCookie, "Strict");
            cookieUtil.addCookieWithSameSite(httpResponse, refreshCookie, "Strict");
            
            // Return user info (but NOT the tokens - they're in cookies)
            return ResponseEntity.ok(Map.of(
                    "username", response.getUsername(),
                    "email", response.getEmail(),
                    "fullName", response.getFullName(),
                    "message", "Login successful"
            ));
        } catch (Exception e) {
            // Record failed attempt
            rateLimitingService.recordFailedAttempt(rateLimitKey);
            int remaining = rateLimitingService.getRemainingAttempts(rateLimitKey);
            
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "error", "Invalid credentials",
                            "remainingAttempts", remaining
                    ));
        }
    }
    
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(HttpServletRequest httpRequest, 
                                          HttpServletResponse httpResponse) {
        Optional<String> refreshTokenOpt = cookieUtil.getRefreshTokenFromCookies(httpRequest);
        
        if (refreshTokenOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Refresh token not found"));
        }
        
        String refreshTokenValue = refreshTokenOpt.get();
        Optional<RefreshToken> tokenOpt = refreshTokenService.findByToken(refreshTokenValue);
        
        if (tokenOpt.isEmpty() || !refreshTokenService.validateRefreshToken(tokenOpt.get())) {
            // Clear invalid cookies
            httpResponse.addCookie(cookieUtil.createClearAccessTokenCookie());
            httpResponse.addCookie(cookieUtil.createClearRefreshTokenCookie());
            
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid or expired refresh token"));
        }
        
        RefreshToken storedToken = tokenOpt.get();
        User user = storedToken.getUser();
        
        // Generate new access token
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String newAccessToken = jwtUtil.generateAccessToken(userDetails);
        
        // Rotate refresh token for security
        String clientIp = getClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        RefreshToken newRefreshToken = refreshTokenService.rotateRefreshToken(storedToken, userAgent, clientIp);
        
        // Set new tokens in cookies
        Cookie accessCookie = cookieUtil.createAccessTokenCookie(newAccessToken);
        Cookie refreshCookie = cookieUtil.createRefreshTokenCookie(newRefreshToken.getToken());
        
        cookieUtil.addCookieWithSameSite(httpResponse, accessCookie, "Strict");
        cookieUtil.addCookieWithSameSite(httpResponse, refreshCookie, "Strict");
        
        return ResponseEntity.ok(Map.of("message", "Token refreshed successfully"));
    }
    
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest httpRequest, 
                                    HttpServletResponse httpResponse) {
        // Revoke refresh token if present
        Optional<String> refreshTokenOpt = cookieUtil.getRefreshTokenFromCookies(httpRequest);
        refreshTokenOpt.flatMap(refreshTokenService::findByToken)
                .ifPresent(refreshTokenService::revokeToken);
        
        // Clear cookies
        Cookie clearAccess = cookieUtil.createClearAccessTokenCookie();
        Cookie clearRefresh = cookieUtil.createClearRefreshTokenCookie();
        
        cookieUtil.addCookieWithSameSite(httpResponse, clearAccess, "Strict");
        cookieUtil.addCookieWithSameSite(httpResponse, clearRefresh, "Strict");
        
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }
    
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not authenticated"));
        }
        
        User user = authService.findByUsername(userDetails.getUsername());
        return ResponseEntity.ok(Map.of(
                "username", user.getUsername(),
                "email", user.getEmail(),
                "fullName", user.getFullName()
        ));
    }
    
    @PostMapping("/logout-all")
    public ResponseEntity<?> logoutAllDevices(@AuthenticationPrincipal UserDetails userDetails,
                                               HttpServletResponse httpResponse) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not authenticated"));
        }
        
        // Revoke all refresh tokens for this user
        refreshTokenService.revokeAllUserTokens(userDetails.getUsername());
        
        // Clear cookies on this device
        cookieUtil.addCookieWithSameSite(httpResponse, cookieUtil.createClearAccessTokenCookie(), "Strict");
        cookieUtil.addCookieWithSameSite(httpResponse, cookieUtil.createClearRefreshTokenCookie(), "Strict");
        
        return ResponseEntity.ok(Map.of("message", "Logged out from all devices"));
    }
    
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        
        // Rate limit registration attempts by IP
        if (rateLimitingService.isRateLimited("register:" + clientIp)) {
            long secondsUntilUnlock = rateLimitingService.getSecondsUntilUnlock("register:" + clientIp);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of(
                            "error", "Too many registration attempts",
                            "message", "Please try again later.",
                            "retryAfterSeconds", secondsUntilUnlock
                    ));
        }
        
        try {
            User user = authService.register(request);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            rateLimitingService.recordFailedAttempt("register:" + clientIp);
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Extract client IP address, handling proxy headers.
     */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            // Take the first IP in the chain (original client)
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
}
