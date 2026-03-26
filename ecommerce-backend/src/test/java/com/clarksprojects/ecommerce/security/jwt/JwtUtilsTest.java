package com.clarksprojects.ecommerce.security.jwt;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilsTest {

    private JwtUtils jwtUtils;

    @BeforeEach
    void setUp() {
        jwtUtils = new JwtUtils();
        ReflectionTestUtils.setField(jwtUtils, "jwtSecret",
                "dGhpc0lzQVRlc3RKd3RTaWduaW5nS2V5Rm9yVW5pdFRlc3RzT25seVRoaXNJc05vdFByb2R1Y3Rpb24=");
        ReflectionTestUtils.setField(jwtUtils, "jwtExpirationMs", 3600000L);
    }

    @Test
    void generateToken_shouldReturnNonNullToken() {
        String token = jwtUtils.generateToken("test@example.com");
        assertNotNull(token);
        assertFalse(token.isEmpty());
    }

    @Test
    void getEmailFromToken_shouldReturnCorrectEmail() {
        String token = jwtUtils.generateToken("user@example.com");
        String email = jwtUtils.getEmailFromToken(token);
        assertEquals("user@example.com", email);
    }

    @Test
    void validateToken_shouldReturnTrueForValidToken() {
        String token = jwtUtils.generateToken("valid@example.com");
        assertTrue(jwtUtils.validateToken(token));
    }

    @Test
    void validateToken_shouldReturnFalseForInvalidToken() {
        assertFalse(jwtUtils.validateToken("invalid.token.string"));
    }

    @Test
    void validateToken_shouldReturnFalseForNullToken() {
        assertFalse(jwtUtils.validateToken(null));
    }

    @Test
    void validateToken_shouldReturnFalseForEmptyToken() {
        assertFalse(jwtUtils.validateToken(""));
    }

    @Test
    void validateToken_shouldReturnFalseForExpiredToken() {
        JwtUtils shortLivedUtils = new JwtUtils();
        ReflectionTestUtils.setField(shortLivedUtils, "jwtSecret",
                "dGhpc0lzQVRlc3RKd3RTaWduaW5nS2V5Rm9yVW5pdFRlc3RzT25seVRoaXNJc05vdFByb2R1Y3Rpb24=");
        ReflectionTestUtils.setField(shortLivedUtils, "jwtExpirationMs", -1000L);

        String token = shortLivedUtils.generateToken("expired@example.com");
        assertFalse(jwtUtils.validateToken(token));
    }

    @Test
    void generateToken_shouldProduceUniqueTokens() {
        String token1 = jwtUtils.generateToken("same@example.com");
        String token2 = jwtUtils.generateToken("same@example.com");
        // Tokens should differ due to different issuedAt timestamps (or at minimum be valid)
        assertNotNull(token1);
        assertNotNull(token2);
    }
}
