package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.LoginRequest;
import com.clarksprojects.ats.dto.UserInfoResponse;
import com.clarksprojects.ats.entity.RefreshToken;
import com.clarksprojects.ats.entity.User;
import com.clarksprojects.ats.repository.RefreshTokenRepository;
import com.clarksprojects.ats.repository.UserRepository;
import com.clarksprojects.ats.security.CookieUtil;
import com.clarksprojects.ats.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private static final int MAX_ACTIVE_REFRESH_TOKENS_PER_USER = 5;

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtUtil jwtUtil;
    private final CookieUtil cookieUtil;

    @Transactional
    public UserInfoResponse login(LoginRequest request, HttpServletRequest http, HttpServletResponse response) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
        } catch (BadCredentialsException e) {
            throw new BadCredentialsException("Invalid username or password");
        }

        User user = userRepository.findByUsernameIgnoreCase(request.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + request.getUsername()));

        if (!user.isEnabled()) {
            throw new BadCredentialsException("Account disabled");
        }

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        issueTokens(user, http, response);
        log.info("User logged in: username={}, role={}", user.getUsername(), user.getRole());
        return UserInfoResponse.from(user);
    }

    @Transactional
    public UserInfoResponse refresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = cookieUtil.readRefreshToken(request)
                .orElseThrow(() -> new BadCredentialsException("Missing refresh token"));

        if (!jwtUtil.validateRefreshToken(refreshToken)) {
            throw new BadCredentialsException("Refresh token invalid or expired");
        }

        RefreshToken stored = refreshTokenRepository.findByToken(refreshToken)
                .orElseThrow(() -> new BadCredentialsException("Refresh token not recognised"));

        if (!stored.isActive()) {
            throw new BadCredentialsException("Refresh token revoked");
        }

        User user = stored.getUser();
        stored.setRevokedAt(LocalDateTime.now());
        refreshTokenRepository.save(stored);

        issueTokens(user, request, response);
        log.info("Refreshed tokens for {}", user.getUsername());
        return UserInfoResponse.from(user);
    }

    @Transactional
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        cookieUtil.readRefreshToken(request)
                .flatMap(refreshTokenRepository::findByToken)
                .ifPresent(t -> {
                    t.setRevokedAt(LocalDateTime.now());
                    refreshTokenRepository.save(t);
                });
        cookieUtil.clearAuthCookies(response);
    }

    private void issueTokens(User user, HttpServletRequest request, HttpServletResponse response) {
        String accessToken = jwtUtil.generateAccessToken(user, user.getRole().name());
        String refreshToken = jwtUtil.generateRefreshToken(user);

        cookieUtil.writeAccessTokenCookie(response, accessToken);
        cookieUtil.writeRefreshTokenCookie(response, refreshToken);

        enforceSessionLimit(user);
        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .token(refreshToken)
                .expiresAt(LocalDateTime.now()
                        .plusSeconds(jwtUtil.getRefreshTokenExpirationMs() / 1000))
                .userAgent(request != null ? truncate(request.getHeader("User-Agent"), 500) : null)
                .ipAddress(request != null ? truncate(request.getRemoteAddr(), 64) : null)
                .build());
    }

    private void enforceSessionLimit(User user) {
        long active = refreshTokenRepository
                .countByUserAndRevokedAtIsNullAndExpiresAtAfter(user, LocalDateTime.now());
        if (active >= MAX_ACTIVE_REFRESH_TOKENS_PER_USER) {
            refreshTokenRepository.revokeAllForUser(user, LocalDateTime.now());
            log.info("Revoked all sessions for {} (hit max {})", user.getUsername(), MAX_ACTIVE_REFRESH_TOKENS_PER_USER);
        }
    }

    private static String truncate(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }
}
