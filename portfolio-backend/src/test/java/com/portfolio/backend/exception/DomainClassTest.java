package com.portfolio.backend.exception;

import com.portfolio.backend.dto.ApiResponse;
import com.portfolio.backend.entity.RefreshToken;
import com.portfolio.backend.projects.ProjectStatusResponse;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests for exception/DTO/entity classes that carry logic but have no dedicated test file.
 */
class DomainClassTest {

    // -------------------------------------------------------------------------
    // AuthenticationException
    // -------------------------------------------------------------------------

    @Test
    void authenticationException_fromErrorType_hasExpectedMessage() {
        AuthenticationException ex = new AuthenticationException(
                AuthenticationException.AuthenticationError.TOKEN_EXPIRED);

        assertThat(ex.getMessage()).isEqualTo("Authentication token has expired");
        assertThat(ex.getErrorType()).isEqualTo(AuthenticationException.AuthenticationError.TOKEN_EXPIRED);
    }

    @Test
    void authenticationException_fromString_hasExpectedMessageAndDefaultErrorType() {
        AuthenticationException ex = new AuthenticationException("Custom auth failure");

        assertThat(ex.getMessage()).isEqualTo("Custom auth failure");
        assertThat(ex.getErrorType()).isEqualTo(AuthenticationException.AuthenticationError.INVALID_CREDENTIALS);
    }

    @Test
    void authenticationError_getMessage_returnsEnumMessage() {
        assertThat(AuthenticationException.AuthenticationError.TOKEN_INVALID.getMessage())
                .isEqualTo("Invalid authentication token");
        assertThat(AuthenticationException.AuthenticationError.REFRESH_TOKEN_EXPIRED.getMessage())
                .isEqualTo("Refresh token has expired");
        assertThat(AuthenticationException.AuthenticationError.REFRESH_TOKEN_INVALID.getMessage())
                .isEqualTo("Invalid refresh token");
        assertThat(AuthenticationException.AuthenticationError.NOT_AUTHENTICATED.getMessage())
                .isEqualTo("User is not authenticated");
    }

    // -------------------------------------------------------------------------
    // DuplicateResourceException
    // -------------------------------------------------------------------------

    @Test
    void duplicateResourceException_getters_returnConstructorValues() {
        DuplicateResourceException ex = new DuplicateResourceException("User", "email", "test@example.com");

        assertThat(ex.getMessage()).contains("User").contains("email").contains("test@example.com");
        assertThat(ex.getResourceName()).isEqualTo("User");
        assertThat(ex.getFieldName()).isEqualTo("email");
        assertThat(ex.getFieldValue()).isEqualTo("test@example.com");
    }

    // -------------------------------------------------------------------------
    // ResourceNotFoundException
    // -------------------------------------------------------------------------

    @Test
    void resourceNotFoundException_threeArgConstructor_hasExpectedMessage() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Project", "id", 42L);

        assertThat(ex.getMessage()).contains("Project").contains("id").contains("42");
        assertThat(ex.getResourceName()).isEqualTo("Project");
        assertThat(ex.getFieldName()).isEqualTo("id");
        assertThat(ex.getFieldValue()).isEqualTo(42L);
    }

    @Test
    void resourceNotFoundException_stringConstructor_nullableGetters() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Resource gone");

        assertThat(ex.getMessage()).isEqualTo("Resource gone");
        assertThat(ex.getResourceName()).isNull();
        assertThat(ex.getFieldName()).isNull();
        assertThat(ex.getFieldValue()).isNull();
    }

    // -------------------------------------------------------------------------
    // RefreshToken entity
    // -------------------------------------------------------------------------

    @Test
    void refreshToken_isExpired_returnsTrueWhenPastExpiry() {
        RefreshToken token = new RefreshToken();
        token.setExpiryDate(Instant.now().minusSeconds(60));

        assertThat(token.isExpired()).isTrue();
    }

    @Test
    void refreshToken_isExpired_returnsFalseWhenNotExpired() {
        RefreshToken token = new RefreshToken();
        token.setExpiryDate(Instant.now().plusSeconds(3600));

        assertThat(token.isExpired()).isFalse();
    }

    @Test
    void refreshToken_isValid_returnsFalseWhenRevoked() {
        RefreshToken token = new RefreshToken();
        token.setRevoked(true);
        token.setExpiryDate(Instant.now().plusSeconds(3600));

        assertThat(token.isValid()).isFalse();
    }

    @Test
    void refreshToken_isValid_returnsFalseWhenExpired() {
        RefreshToken token = new RefreshToken();
        token.setRevoked(false);
        token.setExpiryDate(Instant.now().minusSeconds(60));

        assertThat(token.isValid()).isFalse();
    }

    @Test
    void refreshToken_isValid_returnsTrueWhenActiveAndNotExpired() {
        RefreshToken token = new RefreshToken();
        token.setRevoked(false);
        token.setExpiryDate(Instant.now().plusSeconds(3600));

        assertThat(token.isValid()).isTrue();
    }

    // -------------------------------------------------------------------------
    // ProjectStatusResponse
    // -------------------------------------------------------------------------

    @Test
    void projectStatusResponse_active_hasCorrectStatusAndNullMessage() {
        ProjectStatusResponse r = ProjectStatusResponse.active("My App");

        assertThat(r.project()).isEqualTo("My App");
        assertThat(r.status()).isEqualTo(ProjectStatusResponse.ProjectStatus.ACTIVE);
        assertThat(r.message()).isNull();
    }

    @Test
    void projectStatusResponse_of_appliesCustomStatusAndMessage() {
        ProjectStatusResponse r = ProjectStatusResponse.of(
                "App", ProjectStatusResponse.ProjectStatus.MAINTENANCE, "In maintenance");

        assertThat(r.project()).isEqualTo("App");
        assertThat(r.status()).isEqualTo(ProjectStatusResponse.ProjectStatus.MAINTENANCE);
        assertThat(r.message()).isEqualTo("In maintenance");
    }

    @Test
    void projectStatusEnum_getValue_returnsKebabCaseString() {
        assertThat(ProjectStatusResponse.ProjectStatus.COMING_SOON.getValue()).isEqualTo("coming-soon");
        assertThat(ProjectStatusResponse.ProjectStatus.ACTIVE.getValue()).isEqualTo("active");
        assertThat(ProjectStatusResponse.ProjectStatus.MAINTENANCE.getValue()).isEqualTo("maintenance");
    }

    // -------------------------------------------------------------------------
    // ApiResponse
    // -------------------------------------------------------------------------

    @Test
    void apiResponse_successWithDataAndMessage_hasCorrectFields() {
        ApiResponse<String> r = ApiResponse.success("Done", "payload");

        assertThat(r.isSuccess()).isTrue();
        assertThat(r.getMessage()).isEqualTo("Done");
        assertThat(r.getData()).isEqualTo("payload");
        assertThat(r.getError()).isNull();
        assertThat(r.getTimestamp()).isNotNull();
    }

    @Test
    void apiResponse_successMessageOnly_hasNullDataAndError() {
        ApiResponse<Void> r = ApiResponse.success("OK");

        assertThat(r.isSuccess()).isTrue();
        assertThat(r.getMessage()).isEqualTo("OK");
        assertThat(r.getData()).isNull();
        assertThat(r.getError()).isNull();
    }

    @Test
    void apiResponse_errorWithMessageAndErrorText_hasCorrectFields() {
        ApiResponse<Void> r = ApiResponse.error("Context info", "Something went wrong");

        assertThat(r.isSuccess()).isFalse();
        assertThat(r.getMessage()).isEqualTo("Context info");
        assertThat(r.getError()).isEqualTo("Something went wrong");
        assertThat(r.getData()).isNull();
    }
}
