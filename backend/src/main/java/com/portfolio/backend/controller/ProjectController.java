package com.portfolio.backend.controller;

import com.portfolio.backend.dto.ApiResponse;
import com.portfolio.backend.entity.Project;
import com.portfolio.backend.exception.ResourceNotFoundException;
import com.portfolio.backend.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for portfolio project management.
 * Provides CRUD operations for projects displayed on the portfolio.
 */
@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public ResponseEntity<List<Project>> getAllProjects() {
        return ResponseEntity.ok(projectService.getAllProjects());
    }

    @GetMapping("/featured")
    public ResponseEntity<List<Project>> getFeaturedProjects() {
        return ResponseEntity.ok(projectService.getFeaturedProjects());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getProjectById(@PathVariable Long id) {
        Project project = projectService.getProjectById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project", "id", id));
        return ResponseEntity.ok(project);
    }

    @PostMapping
    public ResponseEntity<Project> createProject(@Valid @RequestBody Project project) {
        Project created = projectService.createProject(project);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Project> updateProject(
            @PathVariable Long id,
            @Valid @RequestBody Project project) {
        // Verify project exists
        projectService.getProjectById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project", "id", id));
        
        Project updated = projectService.updateProject(id, project);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProject(@PathVariable Long id) {
        // Verify project exists
        projectService.getProjectById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project", "id", id));
        
        projectService.deleteProject(id);
        return ResponseEntity.ok(ApiResponse.success("Project deleted successfully"));
    }
}
