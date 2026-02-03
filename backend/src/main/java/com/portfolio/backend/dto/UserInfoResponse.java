package com.portfolio.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * DTO for returning authenticated user information.
 * Used in login and /me endpoint responses.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record UserInfoResponse(
    String username,
    String email,
    String fullName
) {
    /**
     * Factory method to create from User entity fields.
     */
    public static UserInfoResponse of(String username, String email, String fullName) {
        return new UserInfoResponse(username, email, fullName);
    }
}
