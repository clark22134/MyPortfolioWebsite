package com.portfolio.backend.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RateLimitingServiceTest {

    private RateLimitingService rateLimitingService;

    @BeforeEach
    void setUp() {
        rateLimitingService = new RateLimitingService();
    }

    @Test
    void isRateLimited_WithNoAttempts_ShouldReturnFalse() {
        assertFalse(rateLimitingService.isRateLimited("test-key"));
    }

    @Test
    void isRateLimited_WithFewAttempts_ShouldReturnFalse() {
        String key = "test-user";
        
        rateLimitingService.recordFailedAttempt(key);
        rateLimitingService.recordFailedAttempt(key);
        rateLimitingService.recordFailedAttempt(key);
        
        assertFalse(rateLimitingService.isRateLimited(key));
    }

    @Test
    void isRateLimited_AfterMaxAttempts_ShouldReturnTrue() {
        String key = "brute-force-user";
        
        // Record max attempts (5)
        for (int i = 0; i < 5; i++) {
            rateLimitingService.recordFailedAttempt(key);
        }
        
        assertTrue(rateLimitingService.isRateLimited(key));
    }

    @Test
    void getRemainingAttempts_ShouldDecrementCorrectly() {
        String key = "test-user";
        
        assertEquals(5, rateLimitingService.getRemainingAttempts(key));
        
        rateLimitingService.recordFailedAttempt(key);
        assertEquals(4, rateLimitingService.getRemainingAttempts(key));
        
        rateLimitingService.recordFailedAttempt(key);
        assertEquals(3, rateLimitingService.getRemainingAttempts(key));
    }

    @Test
    void clearAttempts_ShouldResetCounter() {
        String key = "test-user";
        
        rateLimitingService.recordFailedAttempt(key);
        rateLimitingService.recordFailedAttempt(key);
        rateLimitingService.recordFailedAttempt(key);
        
        assertEquals(2, rateLimitingService.getRemainingAttempts(key));
        
        rateLimitingService.clearAttempts(key);
        
        assertEquals(5, rateLimitingService.getRemainingAttempts(key));
        assertFalse(rateLimitingService.isRateLimited(key));
    }

    @Test
    void getSecondsUntilUnlock_WhenNotLocked_ShouldReturnZero() {
        String key = "unlocked-user";
        assertEquals(0, rateLimitingService.getSecondsUntilUnlock(key));
    }

    @Test
    void getSecondsUntilUnlock_WhenLocked_ShouldReturnPositiveValue() {
        String key = "locked-user";
        
        // Trigger lockout
        for (int i = 0; i < 5; i++) {
            rateLimitingService.recordFailedAttempt(key);
        }
        
        long secondsUntilUnlock = rateLimitingService.getSecondsUntilUnlock(key);
        assertTrue(secondsUntilUnlock > 0);
        assertTrue(secondsUntilUnlock <= 1800); // Max 30 minutes
    }

    @Test
    void differentKeys_ShouldBeIndependent() {
        String key1 = "user1";
        String key2 = "user2";
        
        // Max out attempts for user1
        for (int i = 0; i < 5; i++) {
            rateLimitingService.recordFailedAttempt(key1);
        }
        
        assertTrue(rateLimitingService.isRateLimited(key1));
        assertFalse(rateLimitingService.isRateLimited(key2));
        assertEquals(5, rateLimitingService.getRemainingAttempts(key2));
    }
}
