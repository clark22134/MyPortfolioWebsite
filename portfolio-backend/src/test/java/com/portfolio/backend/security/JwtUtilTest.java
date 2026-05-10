package com.portfolio.backend.security;

import com.portfolio.backend.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.context.ActiveProfiles;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class JwtUtilTest {

    @Autowired
    private JwtUtil jwtUtil;

    private UserDetails userDetails;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setUsername("testuser");
        user.setEmail("testuser@example.com");
        user.setPassword("encodedPassword");
        userDetails = user;
    }

    // ── generateAccessToken ──────────────────────────────────────────────────

    @Test
    void generateAccessToken_containsCorrectUsernameAsSubject() {
        String token = jwtUtil.generateAccessToken(userDetails);

        assertThat(jwtUtil.extractUsername(token)).isEqualTo("testuser");
    }

    @Test
    void generateAccessToken_hasTypeClaimOfAccess() {
        String token = jwtUtil.generateAccessToken(userDetails);

        assertThat(jwtUtil.extractTokenType(token)).isEqualTo("access");
    }

    @Test
    void generateAccessToken_isNotExpiredAfterCreation() {
        String token = jwtUtil.generateAccessToken(userDetails);

        assertThat(jwtUtil.extractExpiration(token)).isAfter(new java.util.Date());
    }

    // ── generateRefreshToken ─────────────────────────────────────────────────

    @Test
    void generateRefreshToken_containsCorrectUsernameAsSubject() {
        String token = jwtUtil.generateRefreshToken(userDetails);

        assertThat(jwtUtil.extractUsername(token)).isEqualTo("testuser");
    }

    @Test
    void generateRefreshToken_hasTypeClaimOfRefresh() {
        String token = jwtUtil.generateRefreshToken(userDetails);

        assertThat(jwtUtil.extractTokenType(token)).isEqualTo("refresh");
    }

    // ── validateToken ────────────────────────────────────────────────────────

    @Test
    void validateToken_validAccessToken_returnsTrue() {
        String token = jwtUtil.generateAccessToken(userDetails);

        assertThat(jwtUtil.validateToken(token, userDetails)).isTrue();
    }

    @Test
    void validateToken_wrongUsername_returnsFalse() {
        String token = jwtUtil.generateAccessToken(userDetails);

        User other = new User();
        other.setUsername("otheruser");
        other.setPassword("encoded");

        assertThat(jwtUtil.validateToken(token, other)).isFalse();
    }

    // ── validateAccessToken ──────────────────────────────────────────────────

    @Test
    void validateAccessToken_withAccessToken_returnsTrue() {
        String token = jwtUtil.generateAccessToken(userDetails);

        assertThat(jwtUtil.validateAccessToken(token, userDetails)).isTrue();
    }

    @Test
    void validateAccessToken_withRefreshToken_returnsFalse() {
        String refreshToken = jwtUtil.generateRefreshToken(userDetails);

        // A refresh token should fail validateAccessToken (type mismatch)
        assertThat(jwtUtil.validateAccessToken(refreshToken, userDetails)).isFalse();
    }

    // ── validateRefreshToken ─────────────────────────────────────────────────

    @Test
    void validateRefreshToken_withValidRefreshToken_returnsTrue() {
        String token = jwtUtil.generateRefreshToken(userDetails);

        assertThat(jwtUtil.validateRefreshToken(token)).isTrue();
    }

    @Test
    void validateRefreshToken_withAccessToken_returnsFalse() {
        String accessToken = jwtUtil.generateAccessToken(userDetails);

        // An access token should fail validateRefreshToken (type mismatch)
        assertThat(jwtUtil.validateRefreshToken(accessToken)).isFalse();
    }

    @Test
    void validateRefreshToken_withMalformedToken_returnsFalse() {
        assertThat(jwtUtil.validateRefreshToken("not.a.valid.jwt")).isFalse();
    }

    // ── extractClaim helpers ─────────────────────────────────────────────────

    @Test
    void extractUsername_returnsSubjectFromToken() {
        String token = jwtUtil.generateAccessToken(userDetails);

        assertThat(jwtUtil.extractUsername(token)).isEqualTo("testuser");
    }

    @Test
    void extractTokenType_accessToken_returnsAccessString() {
        String token = jwtUtil.generateAccessToken(userDetails);

        assertThat(jwtUtil.extractTokenType(token)).isEqualTo("access");
    }

    @Test
    void extractTokenType_refreshToken_returnsRefreshString() {
        String token = jwtUtil.generateRefreshToken(userDetails);

        assertThat(jwtUtil.extractTokenType(token)).isEqualTo("refresh");
    }

    // ── expiration getters ────────────────────────────────────────────────────

    @Test
    void getAccessTokenExpirationMs_returnsPositiveValue() {
        assertThat(jwtUtil.getAccessTokenExpirationMs()).isGreaterThan(0);
    }

    @Test
    void getRefreshTokenExpirationMs_returnsLargerThanAccessExpiration() {
        assertThat(jwtUtil.getRefreshTokenExpirationMs())
                .isGreaterThan(jwtUtil.getAccessTokenExpirationMs());
    }
}
