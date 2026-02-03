package com.portfolio.backend.exception;

/**
 * Exception thrown when authentication fails.
 * Results in HTTP 401 Unauthorized response.
 */
public class AuthenticationException extends RuntimeException {

    private final AuthenticationError errorType;

    public enum AuthenticationError {
        INVALID_CREDENTIALS("Invalid username or password"),
        TOKEN_EXPIRED("Authentication token has expired"),
        TOKEN_INVALID("Invalid authentication token"),
        REFRESH_TOKEN_EXPIRED("Refresh token has expired"),
        REFRESH_TOKEN_INVALID("Invalid refresh token"),
        NOT_AUTHENTICATED("User is not authenticated");

        private final String message;

        AuthenticationError(String message) {
            this.message = message;
        }

        public String getMessage() {
            return message;
        }
    }

    public AuthenticationException(AuthenticationError errorType) {
        super(errorType.getMessage());
        this.errorType = errorType;
    }

    public AuthenticationException(String message) {
        super(message);
        this.errorType = AuthenticationError.INVALID_CREDENTIALS;
    }

    public AuthenticationError getErrorType() {
        return errorType;
    }
}
