package com.portfolio.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * DTO for authentication error responses.
 * Provides structured error information for client handling.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AuthErrorResponse(
    String error,
    String message,
    Integer remainingAttempts,
    Long retryAfterSeconds
) {
    /**
     * Create simple error response.
     */
    public static AuthErrorResponse of(String error) {
        return new AuthErrorResponse(error, null, null, null);
    }

    /**
     * Create error response with remaining attempts info.
     */
    public static AuthErrorResponse withRemainingAttempts(String error, int remainingAttempts) {
        return new AuthErrorResponse(error, null, remainingAttempts, null);
    }

    /**
     * Create rate limit error response.
     */
    public static AuthErrorResponse rateLimited(long retryAfterSeconds) {
        long minutes = retryAfterSeconds / 60;
        String message = "Account temporarily locked. Try again in " + minutes + " minutes.";
        return new AuthErrorResponse("Too many failed login attempts", message, null, retryAfterSeconds);
    }
}
