package com.portfolio.backend.projects.codeplayground;

import com.portfolio.backend.projects.ProjectStatusResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for the Code Playground interactive project.
 * Handles code execution and snippet management.
 */
@RestController
@RequestMapping("/api/projects/playground")
public class CodePlaygroundController {

    private static final String PROJECT_NAME = "Code Playground";
    private static final List<String> SUPPORTED_LANGUAGES = List.of("java", "python", "javascript");

    @GetMapping("/status")
    public ResponseEntity<ProjectStatusResponse> getStatus() {
        return ResponseEntity.ok(ProjectStatusResponse.comingSoon(PROJECT_NAME));
    }

    @PostMapping("/execute")
    public ResponseEntity<ProjectStatusResponse> executeCode(@RequestBody Map<String, String> request) {
        return ResponseEntity.ok(
            ProjectStatusResponse.of(PROJECT_NAME,
                ProjectStatusResponse.ProjectStatus.COMING_SOON,
                "Code execution will be available soon")
        );
    }

    @GetMapping("/languages")
    public ResponseEntity<Map<String, Object>> getSupportedLanguages() {
        return ResponseEntity.ok(Map.of(
            "languages", SUPPORTED_LANGUAGES,
            "status", ProjectStatusResponse.ProjectStatus.COMING_SOON.getValue()
        ));
    }
}
