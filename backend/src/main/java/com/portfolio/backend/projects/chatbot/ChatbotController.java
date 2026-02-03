package com.portfolio.backend.projects.chatbot;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for the AI Chatbot project.
 * Handles chat interactions with the AI assistant.
 */
@RestController
@RequestMapping("/api/projects/chatbot")
public class ChatbotController {

    // TODO: Inject ChatbotService when implemented

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(Map.of(
            "status", "coming-soon",
            "project", "AI Chatbot",
            "message", "This project is currently under development"
        ));
    }

    @PostMapping("/chat")
    public ResponseEntity<Map<String, Object>> chat(@RequestBody Map<String, String> request) {
        // Placeholder - will be implemented with OpenAI integration
        return ResponseEntity.ok(Map.of(
            "status", "coming-soon",
            "message", "Chat functionality will be available soon"
        ));
    }
}
