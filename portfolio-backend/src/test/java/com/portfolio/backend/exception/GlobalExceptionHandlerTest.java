package com.portfolio.backend.exception;

import com.portfolio.backend.dto.ApiResponse;
import com.portfolio.backend.dto.AuthErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleResourceNotFound_returns404() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Project not found");

        ResponseEntity<ApiResponse<Void>> response = handler.handleResourceNotFound(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getError()).isEqualTo("Project not found");
    }

    @Test
    void handleDuplicateResource_returns409() {
        DuplicateResourceException ex = new DuplicateResourceException("User", "username", "testuser");

        ResponseEntity<ApiResponse<Void>> response = handler.handleDuplicateResource(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
    }

    @Test
    void handleAuthenticationException_returns401() {
        AuthenticationException ex = new AuthenticationException(
                AuthenticationException.AuthenticationError.INVALID_CREDENTIALS);

        ResponseEntity<AuthErrorResponse> response = handler.handleAuthenticationException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    void handleBadCredentials_returns401() {
        BadCredentialsException ex = new BadCredentialsException("Bad creds");

        ResponseEntity<AuthErrorResponse> response = handler.handleBadCredentials(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("Invalid credentials");
    }

    @Test
    void handleRateLimitExceeded_returns429() {
        RateLimitExceededException ex = new RateLimitExceededException("Too many attempts", 1800L);

        ResponseEntity<AuthErrorResponse> response = handler.handleRateLimitExceeded(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().retryAfterSeconds()).isEqualTo(1800L);
    }

    @Test
    void handleEmailSendException_returns503() {
        EmailSendException ex = new EmailSendException("SMTP failed");

        ResponseEntity<ApiResponse<Void>> response = handler.handleEmailSendException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError()).isEqualTo("Failed to send message. Please try again later.");
    }

    @Test
    void handleIllegalArgument_returns400() {
        IllegalArgumentException ex = new IllegalArgumentException("Invalid input");

        ResponseEntity<ApiResponse<Void>> response = handler.handleIllegalArgument(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError()).isEqualTo("Invalid input");
    }

    @Test
    void handleGenericException_returns500() {
        Exception ex = new RuntimeException("Unexpected");

        ResponseEntity<ApiResponse<Void>> response = handler.handleGenericException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError()).isEqualTo("An unexpected error occurred. Please try again later.");
    }
}
