package com.portfolio.backend.projects.codeplayground;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for the Code Playground project.
 * Handles code execution and snippet management.
 */
@RestController
@RequestMapping("/api/projects/playground")
public class CodePlaygroundController {

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(Map.of(
            "status", "coming-soon",
            "project", "Code Playground",
            "message", "This project is currently under development"
        ));
    }

    @PostMapping("/execute")
    public ResponseEntity<Map<String, Object>> executeCode(@RequestBody Map<String, String> request) {
        // Placeholder - will execute code in sandboxed environment
        return ResponseEntity.ok(Map.of(
            "status", "coming-soon",
            "message", "Code execution will be available soon"
        ));
    }

    @GetMapping("/languages")
    public ResponseEntity<Map<String, Object>> getSupportedLanguages() {
        return ResponseEntity.ok(Map.of(
            "languages", new String[]{"java", "python", "javascript"},
            "status", "coming-soon"
        ));
    }
}
