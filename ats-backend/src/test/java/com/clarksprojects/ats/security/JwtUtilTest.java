package com.clarksprojects.ats.security;

import com.clarksprojects.ats.entity.Role;
import com.clarksprojects.ats.entity.User;
import io.jsonwebtoken.ExpiredJwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class JwtUtilTest {

    private JwtUtil jwtUtil;
    private User user;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret",
                "unit-test-secret-must-be-at-least-256-bits-long-for-hmac-sha");
        ReflectionTestUtils.setField(jwtUtil, "accessTokenExpiration", 60_000L);
        ReflectionTestUtils.setField(jwtUtil, "refreshTokenExpiration", 600_000L);
        jwtUtil.initSigningKey();

        user = User.builder()
                .id(1L).username("alice").password("pw").email("a@x.com")
                .fullName("Alice").role(Role.RECRUITER).build();
    }

    @Test
    void generateAccessToken_roundtripsUsernameAndRole() {
        String token = jwtUtil.generateAccessToken(user, user.getRole().name());

        assertThat(jwtUtil.extractUsername(token)).isEqualTo("alice");
        assertThat(jwtUtil.extractRole(token)).isEqualTo("RECRUITER");
        assertThat(jwtUtil.extractTokenType(token)).isEqualTo(JwtUtil.TOKEN_TYPE_ACCESS);
        assertThat(jwtUtil.validateAccessToken(token, user)).isTrue();
        assertThat(jwtUtil.validateRefreshToken(token)).isFalse();
    }

    @Test
    void generateRefreshToken_isMarkedRefresh() {
        String token = jwtUtil.generateRefreshToken(user);

        assertThat(jwtUtil.extractTokenType(token)).isEqualTo(JwtUtil.TOKEN_TYPE_REFRESH);
        assertThat(jwtUtil.validateRefreshToken(token)).isTrue();
        assertThat(jwtUtil.validateAccessToken(token, user)).isFalse();
    }

    @Test
    void validateAccessToken_garbageToken_returnsFalse() {
        assertThat(jwtUtil.validateAccessToken("not-a-jwt", user)).isFalse();
    }

    @Test
    void expiredToken_isInvalid() throws Exception {
        ReflectionTestUtils.setField(jwtUtil, "accessTokenExpiration", 1L);
        jwtUtil.initSigningKey();
        String token = jwtUtil.generateAccessToken(user, user.getRole().name());
        Thread.sleep(20);

        assertThat(jwtUtil.validateAccessToken(token, user)).isFalse();
        try {
            jwtUtil.extractExpiration(token);
        } catch (ExpiredJwtException ignored) {
            // acceptable
        }
    }

    @Test
    void expirationGetters_returnConfiguredValues() {
        assertThat(jwtUtil.getAccessTokenExpirationMs()).isEqualTo(60_000L);
        assertThat(jwtUtil.getRefreshTokenExpirationMs()).isEqualTo(600_000L);
    }
}
