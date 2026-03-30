package com.portfolio.backend.projects.taskmanager;

import com.portfolio.backend.projects.ProjectStatusResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for the Task Manager interactive project.
 * Handles task and board management operations.
 */
@RestController
@RequestMapping("/api/projects/tasks")
public class TaskManagerController {

    private static final String PROJECT_NAME = "Task Manager";

    @GetMapping("/status")
    public ResponseEntity<ProjectStatusResponse> getStatus() {
        return ResponseEntity.ok(ProjectStatusResponse.comingSoon(PROJECT_NAME));
    }

    @GetMapping("/boards")
    public ResponseEntity<ProjectStatusResponse> getBoards() {
        return ResponseEntity.ok(
            ProjectStatusResponse.of(PROJECT_NAME,
                ProjectStatusResponse.ProjectStatus.COMING_SOON,
                "Board management will be available soon")
        );
    }
}
