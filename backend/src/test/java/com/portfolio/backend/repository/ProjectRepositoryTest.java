package com.portfolio.backend.repository;

import com.portfolio.backend.entity.Project;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class ProjectRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private ProjectRepository projectRepository;

    private Project project1;
    private Project project2;
    private Project project3;

    @BeforeEach
    void setUp() {
        project1 = new Project();
        project1.setTitle("Portfolio Website");
        project1.setDescription("A modern portfolio website");
        project1.setTechnologies(Arrays.asList("Angular", "Spring Boot", "AWS"));
        project1.setImageUrl("/images/portfolio.jpg");
        project1.setGithubUrl("https://github.com/user/portfolio");
        project1.setFeatured(true);

        project2 = new Project();
        project2.setTitle("E-commerce Platform");
        project2.setDescription("An online shopping platform");
        project2.setTechnologies(Arrays.asList("React", "Node.js", "MongoDB"));
        project2.setImageUrl("/images/ecommerce.jpg");
        project2.setFeatured(false);

        project3 = new Project();
        project3.setTitle("Task Manager");
        project3.setDescription("A productivity task management app");
        project3.setTechnologies(Arrays.asList("Vue.js", "Django", "PostgreSQL"));
        project3.setImageUrl("/images/taskmanager.jpg");
        project3.setFeatured(true);
    }

    @Test
    void findByFeaturedTrue_ShouldReturnOnlyFeaturedProjects() {
        // Arrange
        entityManager.persist(project1);
        entityManager.persist(project2);
        entityManager.persist(project3);
        entityManager.flush();

        // Act
        List<Project> featuredProjects = projectRepository.findByFeaturedTrue();

        // Assert
        assertThat(featuredProjects).hasSize(2);
        assertThat(featuredProjects).extracting(Project::getTitle)
                .containsExactlyInAnyOrder("Portfolio Website", "Task Manager");
        assertThat(featuredProjects).allMatch(Project::isFeatured);
    }

    @Test
    void findByFeaturedTrue_WithNoFeaturedProjects_ShouldReturnEmptyList() {
        // Arrange
        project1.setFeatured(false);
        project3.setFeatured(false);
        entityManager.persist(project1);
        entityManager.persist(project2);
        entityManager.persist(project3);
        entityManager.flush();

        // Act
        List<Project> featuredProjects = projectRepository.findByFeaturedTrue();

        // Assert
        assertThat(featuredProjects).isEmpty();
    }

    @Test
    void save_ShouldPersistProject() {
        // Act
        Project savedProject = projectRepository.save(project1);

        // Assert
        assertThat(savedProject.getId()).isNotNull();
        assertThat(savedProject.getTitle()).isEqualTo("Portfolio Website");
        assertThat(savedProject.getTechnologies()).containsExactly("Angular", "Spring Boot", "AWS");
        
        Project foundProject = entityManager.find(Project.class, savedProject.getId());
        assertThat(foundProject).isNotNull();
        assertThat(foundProject.getTitle()).isEqualTo("Portfolio Website");
    }

    @Test
    void findById_WithValidId_ShouldReturnProject() {
        // Arrange
        Project persistedProject = entityManager.persist(project1);
        entityManager.flush();

        // Act
        Optional<Project> foundProject = projectRepository.findById(persistedProject.getId());

        // Assert
        assertThat(foundProject).isPresent();
        assertThat(foundProject.get().getTitle()).isEqualTo("Portfolio Website");
        assertThat(foundProject.get().getDescription()).isEqualTo("A modern portfolio website");
    }

    @Test
    void findById_WithInvalidId_ShouldReturnEmpty() {
        // Act
        Optional<Project> foundProject = projectRepository.findById(999L);

        // Assert
        assertThat(foundProject).isEmpty();
    }

    @Test
    void findAll_ShouldReturnAllProjects() {
        // Arrange
        entityManager.persist(project1);
        entityManager.persist(project2);
        entityManager.persist(project3);
        entityManager.flush();

        // Act
        List<Project> allProjects = projectRepository.findAll();

        // Assert
        assertThat(allProjects).hasSize(3);
        assertThat(allProjects).extracting(Project::getTitle)
                .containsExactlyInAnyOrder("Portfolio Website", "E-commerce Platform", "Task Manager");
    }

    @Test
    void deleteById_ShouldRemoveProject() {
        // Arrange
        Project persistedProject = entityManager.persist(project1);
        entityManager.flush();
        Long projectId = persistedProject.getId();

        // Act
        projectRepository.deleteById(projectId);
        entityManager.flush();

        // Assert
        Optional<Project> deletedProject = projectRepository.findById(projectId);
        assertThat(deletedProject).isEmpty();
    }

    @Test
    void update_ShouldModifyProject() {
        // Arrange
        Project persistedProject = entityManager.persist(project1);
        entityManager.flush();
        Long projectId = persistedProject.getId();
        entityManager.clear(); // Detach the entity

        // Act - Create a new entity with updated values
        Project updatedProject = new Project();
        updatedProject.setId(projectId);
        updatedProject.setTitle("Updated Portfolio");
        updatedProject.setDescription("Updated description");
        updatedProject.setTechnologies(persistedProject.getTechnologies());
        updatedProject.setFeatured(persistedProject.isFeatured());
        projectRepository.save(updatedProject);
        entityManager.flush();
        entityManager.clear(); // Clear persistence context to force a fresh fetch

        // Assert
        Optional<Project> foundProject = projectRepository.findById(projectId);
        assertThat(foundProject).isPresent();
        assertThat(foundProject.get().getTitle()).isEqualTo("Updated Portfolio");
        assertThat(foundProject.get().getDescription()).isEqualTo("Updated description");
    }
}
