package com.portfolio.backend.exception;

/**
 * Exception thrown when email sending fails.
 * Results in HTTP 503 Service Unavailable response.
 */
public class EmailSendException extends RuntimeException {

    public EmailSendException(String message) {
        super(message);
    }

    public EmailSendException(String message, Throwable cause) {
        super(message, cause);
    }
}
