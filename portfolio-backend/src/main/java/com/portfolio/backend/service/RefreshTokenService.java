package com.portfolio.backend.service;

import com.portfolio.backend.entity.RefreshToken;
import com.portfolio.backend.entity.User;
import com.portfolio.backend.repository.RefreshTokenRepository;
import com.portfolio.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Service for managing refresh tokens.
 * Handles token creation, validation, rotation, and cleanup.
 */
@Service
public class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final long refreshTokenExpirationMs;
    private final int maxTokensPerUser;

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            UserRepository userRepository,
            @Value("${jwt.refresh.expiration:604800000}") long refreshTokenExpirationMs,
            @Value("${jwt.refresh.max-per-user:5}") int maxTokensPerUser) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.userRepository = userRepository;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
        this.maxTokensPerUser = maxTokensPerUser;
    }

    /**
     * Create a new refresh token for a user.
     */
    @Transactional
    public RefreshToken createRefreshToken(User user, String userAgent, String ipAddress) {
        enforceMaxTokensPerUser(user);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setExpiryDate(Instant.now().plusMillis(refreshTokenExpirationMs));
        refreshToken.setUserAgent(userAgent);
        refreshToken.setIpAddress(ipAddress);

        return refreshTokenRepository.save(refreshToken);
    }

    private void enforceMaxTokensPerUser(User user) {
        long activeTokenCount = refreshTokenRepository.countByUserAndRevokedFalse(user);
        if (activeTokenCount >= maxTokensPerUser) {
            log.debug("Max tokens reached for user {}, revoking all", user.getUsername());
            refreshTokenRepository.revokeAllByUser(user);
        }
    }

    /**
     * Find a refresh token by its value.
     */
    public Optional<RefreshToken> findByToken(String token) {
        return refreshTokenRepository.findByTokenAndRevokedFalse(token);
    }

    /**
     * Validate a refresh token.
     */
    public boolean validateRefreshToken(RefreshToken token) {
        if (token == null) {
            return false;
        }
        if (token.isRevoked()) {
            return false;
        }
        if (token.isExpired()) {
            // Auto-revoke expired tokens
            token.setRevoked(true);
            refreshTokenRepository.save(token);
            return false;
        }
        return true;
    }

    /**
     * Revoke a specific refresh token.
     */
    @Transactional
    public void revokeToken(RefreshToken token) {
        token.setRevoked(true);
        refreshTokenRepository.save(token);
    }

    /**
     * Revoke all refresh tokens for a user (logout from all devices).
     */
    @Transactional
    public void revokeAllUserTokens(User user) {
        refreshTokenRepository.revokeAllByUser(user);
    }

    /**
     * Revoke all refresh tokens for a user by username.
     */
    @Transactional
    public void revokeAllUserTokens(String username) {
        userRepository.findByUsername(username).ifPresent(user ->
            refreshTokenRepository.revokeAllByUser(user)
        );
    }

    /**
     * Rotate a refresh token (revoke old, create new).
     * This is a security best practice to prevent token reuse.
     */
    @Transactional
    public RefreshToken rotateRefreshToken(RefreshToken oldToken, String userAgent, String ipAddress) {
        revokeToken(oldToken);
        return createRefreshToken(oldToken.getUser(), userAgent, ipAddress);
    }

    /**
     * Scheduled task to clean up expired refresh tokens.
     * Runs daily at 2 AM.
     */
    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void cleanupExpiredTokens() {
        refreshTokenRepository.deleteExpiredTokens(Instant.now());
    }
}
