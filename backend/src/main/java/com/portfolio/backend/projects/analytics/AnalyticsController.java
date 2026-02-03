package com.portfolio.backend.projects.analytics;

import com.portfolio.backend.projects.ProjectStatusResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for the Real-Time Analytics interactive project.
 * Handles dashboard data and streaming endpoints.
 */
@RestController
@RequestMapping("/api/projects/analytics")
public class AnalyticsController {

    private static final String PROJECT_NAME = "Real-Time Analytics";

    @GetMapping("/status")
    public ResponseEntity<ProjectStatusResponse> getStatus() {
        return ResponseEntity.ok(ProjectStatusResponse.comingSoon(PROJECT_NAME));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ProjectStatusResponse> getDashboard() {
        return ResponseEntity.ok(
            ProjectStatusResponse.of(PROJECT_NAME,
                ProjectStatusResponse.ProjectStatus.COMING_SOON,
                "Analytics dashboard will be available soon")
        );
    }
}
