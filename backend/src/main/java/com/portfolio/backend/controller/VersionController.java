package com.portfolio.backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/version")
public class VersionController {

    @Value("${app.version:unknown}")
    private String appVersion;

    @Value("${app.commit:unknown}")
    private String gitCommit;

    @GetMapping
    public Map<String, String> getVersion() {
        Map<String, String> version = new HashMap<>();
        version.put("version", appVersion);
        version.put("commit", gitCommit);
        version.put("timestamp", String.valueOf(System.currentTimeMillis()));
        return version;
    }
}
