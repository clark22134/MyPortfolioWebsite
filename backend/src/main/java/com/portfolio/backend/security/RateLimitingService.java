package com.portfolio.backend.security;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting service to prevent brute-force attacks on authentication endpoints.
 * Uses an in-memory cache with sliding window rate limiting.
 * 
 * For production with multiple instances, consider using Redis for distributed rate limiting.
 */
@Service
public class RateLimitingService {
    
    // Maximum login attempts per window
    private static final int MAX_ATTEMPTS = 5;
    
    // Window duration in seconds (15 minutes)
    private static final long WINDOW_DURATION_SECONDS = 900;
    
    // Lockout duration in seconds (30 minutes)
    private static final long LOCKOUT_DURATION_SECONDS = 1800;
    
    // Cache for tracking attempts: key -> AttemptInfo
    private final Map<String, AttemptInfo> attemptCache = new ConcurrentHashMap<>();
    
    /**
     * Check if the given key (IP or username) is rate limited.
     * 
     * @param key The identifier (IP address or username)
     * @return true if rate limited, false if allowed
     */
    public boolean isRateLimited(String key) {
        AttemptInfo info = attemptCache.get(key);
        if (info == null) {
            return false;
        }
        
        Instant now = Instant.now();
        
        // Check if in lockout period
        if (info.lockedUntil != null && now.isBefore(info.lockedUntil)) {
            return true;
        }
        
        // Reset if lockout has expired
        if (info.lockedUntil != null && now.isAfter(info.lockedUntil)) {
            attemptCache.remove(key);
            return false;
        }
        
        // Check if window has expired
        if (now.isAfter(info.windowStart.plusSeconds(WINDOW_DURATION_SECONDS))) {
            attemptCache.remove(key);
            return false;
        }
        
        return info.attempts >= MAX_ATTEMPTS;
    }
    
    /**
     * Record a failed login attempt.
     * 
     * @param key The identifier (IP address or username)
     */
    public void recordFailedAttempt(String key) {
        Instant now = Instant.now();
        
        attemptCache.compute(key, (k, info) -> {
            if (info == null) {
                return new AttemptInfo(now, 1, null);
            }
            
            // Check if window has expired
            if (now.isAfter(info.windowStart.plusSeconds(WINDOW_DURATION_SECONDS))) {
                return new AttemptInfo(now, 1, null);
            }
            
            int newAttempts = info.attempts + 1;
            Instant lockUntil = null;
            
            // Lock if max attempts exceeded
            if (newAttempts >= MAX_ATTEMPTS) {
                lockUntil = now.plusSeconds(LOCKOUT_DURATION_SECONDS);
            }
            
            return new AttemptInfo(info.windowStart, newAttempts, lockUntil);
        });
    }
    
    /**
     * Clear attempts after successful login.
     * 
     * @param key The identifier (IP address or username)
     */
    public void clearAttempts(String key) {
        attemptCache.remove(key);
    }
    
    /**
     * Get remaining attempts for a key.
     * 
     * @param key The identifier
     * @return Number of remaining attempts
     */
    public int getRemainingAttempts(String key) {
        AttemptInfo info = attemptCache.get(key);
        if (info == null) {
            return MAX_ATTEMPTS;
        }
        
        Instant now = Instant.now();
        
        // Check if window has expired
        if (now.isAfter(info.windowStart.plusSeconds(WINDOW_DURATION_SECONDS))) {
            return MAX_ATTEMPTS;
        }
        
        return Math.max(0, MAX_ATTEMPTS - info.attempts);
    }
    
    /**
     * Get seconds until lockout expires.
     * 
     * @param key The identifier
     * @return Seconds until unlock, or 0 if not locked
     */
    public long getSecondsUntilUnlock(String key) {
        AttemptInfo info = attemptCache.get(key);
        if (info == null || info.lockedUntil == null) {
            return 0;
        }
        
        Instant now = Instant.now();
        if (now.isAfter(info.lockedUntil)) {
            return 0;
        }
        
        return info.lockedUntil.getEpochSecond() - now.getEpochSecond();
    }
    
    private static class AttemptInfo {
        final Instant windowStart;
        final int attempts;
        final Instant lockedUntil;
        
        AttemptInfo(Instant windowStart, int attempts, Instant lockedUntil) {
            this.windowStart = windowStart;
            this.attempts = attempts;
            this.lockedUntil = lockedUntil;
        }
    }
}
