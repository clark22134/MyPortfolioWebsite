package com.portfolio.backend.projects;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Standardized response DTO for interactive project status endpoints.
 * Provides consistent response structure across all project modules.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProjectStatusResponse(
    String project,
    ProjectStatus status,
    String message
) {
    /**
     * Project development status.
     */
    public enum ProjectStatus {
        COMING_SOON("coming-soon"),
        ACTIVE("active"),
        MAINTENANCE("maintenance");

        private final String value;

        ProjectStatus(String value) {
            this.value = value;
        }

        public String getValue() {
            return value;
        }
    }

    /**
     * Create a coming soon status response.
     */
    public static ProjectStatusResponse comingSoon(String projectName) {
        return new ProjectStatusResponse(
            projectName,
            ProjectStatus.COMING_SOON,
            "This project is currently under development"
        );
    }

    /**
     * Create an active status response.
     */
    public static ProjectStatusResponse active(String projectName) {
        return new ProjectStatusResponse(
            projectName,
            ProjectStatus.ACTIVE,
            null
        );
    }

    /**
     * Create a custom status response.
     */
    public static ProjectStatusResponse of(String projectName, ProjectStatus status, String message) {
        return new ProjectStatusResponse(projectName, status, message);
    }
}
