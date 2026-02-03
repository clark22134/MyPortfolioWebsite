package com.portfolio.backend.service;

import com.portfolio.backend.entity.RefreshToken;
import com.portfolio.backend.entity.User;
import com.portfolio.backend.repository.RefreshTokenRepository;
import com.portfolio.backend.repository.UserRepository;
import com.portfolio.backend.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class RefreshTokenService {

    @Value("${jwt.refresh.expiration:604800000}")
    private Long refreshTokenExpirationMs;

    @Value("${jwt.refresh.max-per-user:5}")
    private int maxTokensPerUser;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    /**
     * Create a new refresh token for a user.
     */
    @Transactional
    public RefreshToken createRefreshToken(User user, String userAgent, String ipAddress) {
        // Limit number of active refresh tokens per user
        long activeTokenCount = refreshTokenRepository.countByUserAndRevokedFalse(user);
        if (activeTokenCount >= maxTokensPerUser) {
            // Revoke all existing tokens if limit reached
            refreshTokenRepository.revokeAllByUser(user);
        }

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setExpiryDate(Instant.now().plusMillis(refreshTokenExpirationMs));
        refreshToken.setUserAgent(userAgent);
        refreshToken.setIpAddress(ipAddress);

        return refreshTokenRepository.save(refreshToken);
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
