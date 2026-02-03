package com.portfolio.backend.projects.analytics;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for the Real-Time Analytics project.
 * Handles dashboard data and streaming endpoints.
 */
@RestController
@RequestMapping("/api/projects/analytics")
public class AnalyticsController {

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(Map.of(
            "status", "coming-soon",
            "project", "Real-Time Analytics",
            "message", "This project is currently under development"
        ));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        // Placeholder - will return dashboard configuration
        return ResponseEntity.ok(Map.of(
            "status", "coming-soon",
            "message", "Analytics dashboard will be available soon"
        ));
    }
}
