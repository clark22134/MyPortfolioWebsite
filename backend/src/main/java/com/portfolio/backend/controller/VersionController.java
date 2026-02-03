package com.portfolio.backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * REST controller for application version information.
 * Provides build and deployment metadata for monitoring and debugging.
 */
@RestController
@RequestMapping("/api/version")
public class VersionController {

    private final String appVersion;
    private final String gitCommit;

    public VersionController(
            @Value("${app.version:unknown}") String appVersion,
            @Value("${app.commit:unknown}") String gitCommit) {
        this.appVersion = appVersion;
        this.gitCommit = gitCommit;
    }

    @GetMapping
    public Map<String, String> getVersion() {
        return Map.of(
                "version", appVersion,
                "commit", gitCommit,
                "timestamp", Instant.now().toString()
        );
    }
}
