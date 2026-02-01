package com.portfolio.backend.service;

import com.portfolio.backend.entity.Project;
import com.portfolio.backend.repository.ProjectRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @InjectMocks
    private ProjectService projectService;

    private Project testProject1;
    private Project testProject2;

    @BeforeEach
    void setUp() {
        testProject1 = new Project();
        testProject1.setId(1L);
        testProject1.setTitle("Portfolio Website");
        testProject1.setDescription("A modern portfolio website");
        testProject1.setTechnologies(Arrays.asList("Angular", "Spring Boot", "AWS"));
        testProject1.setFeatured(true);

        testProject2 = new Project();
        testProject2.setId(2L);
        testProject2.setTitle("E-commerce Platform");
        testProject2.setDescription("An online shopping platform");
        testProject2.setTechnologies(Arrays.asList("React", "Node.js"));
        testProject2.setFeatured(false);
    }

    @Test
    void getAllProjects_ShouldReturnAllProjects() {
        // Arrange
        List<Project> expectedProjects = Arrays.asList(testProject1, testProject2);
        when(projectRepository.findAll()).thenReturn(expectedProjects);

        // Act
        List<Project> actualProjects = projectService.getAllProjects();

        // Assert
        assertThat(actualProjects).hasSize(2);
        assertThat(actualProjects).containsExactlyInAnyOrder(testProject1, testProject2);
        verify(projectRepository, times(1)).findAll();
    }

    @Test
    void getFeaturedProjects_ShouldReturnOnlyFeaturedProjects() {
        // Arrange
        List<Project> featuredProjects = Arrays.asList(testProject1);
        when(projectRepository.findByFeaturedTrue()).thenReturn(featuredProjects);

        // Act
        List<Project> actualProjects = projectService.getFeaturedProjects();

        // Assert
        assertThat(actualProjects).hasSize(1);
        assertThat(actualProjects.get(0).isFeatured()).isTrue();
        assertThat(actualProjects.get(0).getTitle()).isEqualTo("Portfolio Website");
        verify(projectRepository, times(1)).findByFeaturedTrue();
    }

    @Test
    void getProjectById_WithValidId_ShouldReturnProject() {
        // Arrange
        when(projectRepository.findById(1L)).thenReturn(Optional.of(testProject1));

        // Act
        Optional<Project> actualProject = projectService.getProjectById(1L);

        // Assert
        assertThat(actualProject).isPresent();
        assertThat(actualProject.get().getId()).isEqualTo(1L);
        assertThat(actualProject.get().getTitle()).isEqualTo("Portfolio Website");
        verify(projectRepository, times(1)).findById(1L);
    }

    @Test
    void getProjectById_WithInvalidId_ShouldReturnEmpty() {
        // Arrange
        when(projectRepository.findById(999L)).thenReturn(Optional.empty());

        // Act
        Optional<Project> actualProject = projectService.getProjectById(999L);

        // Assert
        assertThat(actualProject).isEmpty();
        verify(projectRepository, times(1)).findById(999L);
    }

    @Test
    void createProject_ShouldSaveAndReturnProject() {
        // Arrange
        when(projectRepository.save(testProject1)).thenReturn(testProject1);

        // Act
        Project savedProject = projectService.createProject(testProject1);

        // Assert
        assertThat(savedProject).isNotNull();
        assertThat(savedProject.getTitle()).isEqualTo("Portfolio Website");
        verify(projectRepository, times(1)).save(testProject1);
    }

    @Test
    void deleteProject_ShouldCallRepositoryDelete() {
        // Arrange
        Long projectId = 1L;
        doNothing().when(projectRepository).deleteById(projectId);

        // Act
        projectService.deleteProject(projectId);

        // Assert
        verify(projectRepository, times(1)).deleteById(projectId);
    }

    @Test
    void updateProject_ShouldUpdateAndReturnProject() {
        // Arrange
        Project updatedProject = new Project();
        updatedProject.setId(1L);
        updatedProject.setTitle("Updated Portfolio");
        updatedProject.setDescription("Updated description");
        
        when(projectRepository.save(any(Project.class))).thenReturn(updatedProject);

        // Act
        Project result = projectService.updateProject(1L, updatedProject);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Updated Portfolio");
        assertThat(result.getDescription()).isEqualTo("Updated description");
        verify(projectRepository, times(1)).save(any(Project.class));
    }
}
