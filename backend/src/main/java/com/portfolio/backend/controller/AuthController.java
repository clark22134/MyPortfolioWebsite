package com.portfolio.backend.controller;

import com.portfolio.backend.dto.AuthErrorResponse;
import com.portfolio.backend.dto.LoginRequest;
import com.portfolio.backend.dto.RegisterRequest;
import com.portfolio.backend.dto.UserInfoResponse;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

/**
 * REST controller for authentication operations.
 * Handles login, logout, token refresh, and user registration.
 *
 * Security features:
 * - HTTP-only cookies for token storage (prevents XSS)
 * - SameSite=Strict cookies (prevents CSRF)
 * - Rate limiting on login attempts
 * - Refresh token rotation
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String SAME_SITE_STRICT = "Strict";

    private final AuthService authService;
    private final RateLimitingService rateLimitingService;
    private final JwtUtil jwtUtil;
    private final CookieUtil cookieUtil;
    private final RefreshTokenService refreshTokenService;
    private final CustomUserDetailsService userDetailsService;

    public AuthController(
            AuthService authService,
            RateLimitingService rateLimitingService,
            JwtUtil jwtUtil,
            CookieUtil cookieUtil,
            RefreshTokenService refreshTokenService,
            CustomUserDetailsService userDetailsService) {
        this.authService = authService;
        this.rateLimitingService = rateLimitingService;
        this.jwtUtil = jwtUtil;
        this.cookieUtil = cookieUtil;
        this.refreshTokenService = refreshTokenService;
        this.userDetailsService = userDetailsService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        String rateLimitKey = createRateLimitKey(httpRequest, request.username());

        if (rateLimitingService.isRateLimited(rateLimitKey)) {
            return createRateLimitResponse(rateLimitKey);
        }

        try {
            return processLogin(request, httpRequest, httpResponse, rateLimitKey);
        } catch (Exception e) {
            return handleFailedLogin(rateLimitKey);
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        Optional<String> refreshTokenOpt = cookieUtil.getRefreshTokenFromCookies(httpRequest);

        if (refreshTokenOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthErrorResponse.of("Refresh token not found"));
        }

        return processTokenRefresh(refreshTokenOpt.get(), httpRequest, httpResponse);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        revokeRefreshTokenIfPresent(httpRequest);
        clearAuthCookies(httpResponse);

        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthErrorResponse.of("Not authenticated"));
        }

        User user = authService.findByUsername(userDetails.getUsername());
        return ResponseEntity.ok(UserInfoResponse.of(
                user.getUsername(),
                user.getEmail(),
                user.getFullName()
        ));
    }

    @PostMapping("/logout-all")
    public ResponseEntity<?> logoutAllDevices(
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletResponse httpResponse) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthErrorResponse.of("Not authenticated"));
        }

        refreshTokenService.revokeAllUserTokens(userDetails.getUsername());
        clearAuthCookies(httpResponse);

        return ResponseEntity.ok(Map.of("message", "Logged out from all devices"));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = extractClientIp(httpRequest);
        String rateLimitKey = "register:" + clientIp;

        if (rateLimitingService.isRateLimited(rateLimitKey)) {
            return createRateLimitResponse(rateLimitKey);
        }

        try {
            User user = authService.register(request);
            return ResponseEntity.ok(UserInfoResponse.of(
                    user.getUsername(),
                    user.getEmail(),
                    user.getFullName()
            ));
        } catch (Exception e) {
            rateLimitingService.recordFailedAttempt(rateLimitKey);
            return ResponseEntity.badRequest()
                    .body(AuthErrorResponse.of(e.getMessage()));
        }
    }

    // ========== Private Helper Methods ==========

    private ResponseEntity<?> processLogin(
            LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse,
            String rateLimitKey) {

        authService.login(request);
        rateLimitingService.clearAttempts(rateLimitKey);

        UserDetails userDetails = userDetailsService.loadUserByUsername(request.username());
        String accessToken = jwtUtil.generateAccessToken(userDetails);

        User user = authService.findByUsername(request.username());
        RefreshToken refreshToken = createAndStoreRefreshToken(user, httpRequest);

        setAuthCookies(httpResponse, accessToken, refreshToken.getToken());

        return ResponseEntity.ok(UserInfoResponse.of(
                user.getUsername(),
                user.getEmail(),
                user.getFullName()
        ));
    }

    private ResponseEntity<?> processTokenRefresh(
            String refreshTokenValue,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        Optional<RefreshToken> tokenOpt = refreshTokenService.findByToken(refreshTokenValue);

        if (tokenOpt.isEmpty() || !refreshTokenService.validateRefreshToken(tokenOpt.get())) {
            clearAuthCookies(httpResponse);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthErrorResponse.of("Invalid or expired refresh token"));
        }

        RefreshToken storedToken = tokenOpt.get();
        User user = storedToken.getUser();

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String newAccessToken = jwtUtil.generateAccessToken(userDetails);

        RefreshToken newRefreshToken = refreshTokenService.rotateRefreshToken(
                storedToken,
                httpRequest.getHeader("User-Agent"),
                extractClientIp(httpRequest)
        );

        setAuthCookies(httpResponse, newAccessToken, newRefreshToken.getToken());

        return ResponseEntity.ok(Map.of("message", "Token refreshed successfully"));
    }

    private ResponseEntity<?> handleFailedLogin(String rateLimitKey) {
        rateLimitingService.recordFailedAttempt(rateLimitKey);
        int remaining = rateLimitingService.getRemainingAttempts(rateLimitKey);

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(AuthErrorResponse.withRemainingAttempts("Invalid credentials", remaining));
    }

    private ResponseEntity<?> createRateLimitResponse(String rateLimitKey) {
        long secondsUntilUnlock = rateLimitingService.getSecondsUntilUnlock(rateLimitKey);
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(AuthErrorResponse.rateLimited(secondsUntilUnlock));
    }

    private RefreshToken createAndStoreRefreshToken(User user, HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        String clientIp = extractClientIp(request);
        return refreshTokenService.createRefreshToken(user, userAgent, clientIp);
    }

    private void setAuthCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        Cookie accessCookie = cookieUtil.createAccessTokenCookie(accessToken);
        Cookie refreshCookie = cookieUtil.createRefreshTokenCookie(refreshToken);

        cookieUtil.addCookieWithSameSite(response, accessCookie, SAME_SITE_STRICT);
        cookieUtil.addCookieWithSameSite(response, refreshCookie, SAME_SITE_STRICT);
    }

    private void clearAuthCookies(HttpServletResponse response) {
        cookieUtil.addCookieWithSameSite(response, cookieUtil.createClearAccessTokenCookie(), SAME_SITE_STRICT);
        cookieUtil.addCookieWithSameSite(response, cookieUtil.createClearRefreshTokenCookie(), SAME_SITE_STRICT);
    }

    private void revokeRefreshTokenIfPresent(HttpServletRequest request) {
        cookieUtil.getRefreshTokenFromCookies(request)
                .flatMap(refreshTokenService::findByToken)
                .ifPresent(refreshTokenService::revokeToken);
    }

    private String createRateLimitKey(HttpServletRequest request, String username) {
        return extractClientIp(request) + ":" + username;
    }

    /**
     * Extract client IP address, handling proxy headers.
     * Checks X-Forwarded-For and X-Real-IP headers for proxied requests.
     */
    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }

        return request.getRemoteAddr();
    }
}
