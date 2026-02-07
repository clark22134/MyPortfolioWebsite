package com.portfolio.backend.service;

import com.portfolio.backend.entity.Project;
import com.portfolio.backend.repository.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Service for portfolio project operations.
 * Provides CRUD functionality for projects displayed on the portfolio.
 */
@Service
@Transactional(readOnly = true)
public class ProjectService {

    private final ProjectRepository projectRepository;

    public ProjectService(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    public List<Project> getAllProjects() {
        return projectRepository.findAll();
    }

    public List<Project> getFeaturedProjects() {
        return projectRepository.findByFeaturedTrue();
    }

    public Optional<Project> getProjectById(Long id) {
        return projectRepository.findById(id);
    }

    @Transactional
    public Project createProject(Project project) {
        return projectRepository.save(project);
    }

    @Transactional
    public Project updateProject(Long id, Project project) {
        project.setId(id);
        return projectRepository.save(project);
    }

    @Transactional
    public void deleteProject(Long id) {
        projectRepository.deleteById(id);
    }
}
