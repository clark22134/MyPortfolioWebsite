package com.portfolio.backend.projects.chatbot;

import com.portfolio.backend.projects.ProjectStatusResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for the AI Chatbot interactive project.
 * Handles chat interactions with the AI assistant.
 */
@RestController
@RequestMapping("/api/projects/chatbot")
public class ChatbotController {

    private static final String PROJECT_NAME = "AI Chatbot";

    @GetMapping("/status")
    public ResponseEntity<ProjectStatusResponse> getStatus() {
        return ResponseEntity.ok(ProjectStatusResponse.comingSoon(PROJECT_NAME));
    }

    @PostMapping("/chat")
    public ResponseEntity<ProjectStatusResponse> chat(@RequestBody Map<String, String> request) {
        return ResponseEntity.ok(
            ProjectStatusResponse.of(PROJECT_NAME, 
                ProjectStatusResponse.ProjectStatus.COMING_SOON,
                "Chat functionality will be available soon")
        );
    }
}
