package com.portfolio.backend.projects.taskmanager;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for the Task Manager project.
 * Handles task and board management operations.
 */
@RestController
@RequestMapping("/api/projects/tasks")
public class TaskManagerController {

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(Map.of(
            "status", "coming-soon",
            "project", "Task Manager",
            "message", "This project is currently under development"
        ));
    }

    @GetMapping("/boards")
    public ResponseEntity<Map<String, Object>> getBoards() {
        // Placeholder - will return user's boards
        return ResponseEntity.ok(Map.of(
            "status", "coming-soon",
            "message", "Board management will be available soon"
        ));
    }
}
