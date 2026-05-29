package com.clarksprojects.ats.dto;

import com.clarksprojects.ats.entity.Role;
import com.clarksprojects.ats.entity.User;

import java.time.LocalDateTime;

public record UserInfoResponse(
        Long id,
        String username,
        String email,
        String fullName,
        Role role,
        boolean enabled,
        LocalDateTime createdAt,
        LocalDateTime lastLoginAt
) {
    public static UserInfoResponse from(User user) {
        return new UserInfoResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.isEnabled(),
                user.getCreatedAt(),
                user.getLastLoginAt()
        );
    }
}
