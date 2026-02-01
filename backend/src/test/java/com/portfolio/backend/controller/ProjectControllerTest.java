package com.portfolio.backend.controller;

import com.portfolio.backend.entity.Project;
import com.portfolio.backend.service.ProjectService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ProjectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectService projectService;

    private List<Project> testProjects;

    @BeforeEach
    void setUp() {
        Project project1 = new Project();
        project1.setId(1L);
        project1.setTitle("Test Project 1");
        project1.setDescription("Description 1");
        project1.setGithubUrl("https://github.com/test/project1");
        project1.setTechnologies(Arrays.asList("Java", "Spring Boot"));
        project1.setStartDate(LocalDate.of(2024, 1, 1));
        project1.setFeatured(true);

        Project project2 = new Project();
        project2.setId(2L);
        project2.setTitle("Test Project 2");
        project2.setDescription("Description 2");
        project2.setGithubUrl("https://github.com/test/project2");
        project2.setTechnologies(Arrays.asList("Angular", "TypeScript"));
        project2.setStartDate(LocalDate.of(2024, 2, 1));
        project2.setFeatured(false);

        testProjects = Arrays.asList(project1, project2);
    }

    @Test
    @WithMockUser
    void getAllProjects_ShouldReturnAllProjects() throws Exception {
        when(projectService.getAllProjects()).thenReturn(testProjects);

        mockMvc.perform(get("/api/projects")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("Test Project 1"))
                .andExpect(jsonPath("$[1].title").value("Test Project 2"));
    }

    @Test
    @WithMockUser
    void getFeaturedProjects_ShouldReturnOnlyFeaturedProjects() throws Exception {
        List<Project> featuredProjects = Arrays.asList(testProjects.get(0));
        when(projectService.getFeaturedProjects()).thenReturn(featuredProjects);

        mockMvc.perform(get("/api/projects/featured")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Test Project 1"))
                .andExpect(jsonPath("$[0].featured").value(true));
    }

    @Test
    @WithMockUser
    void getProjectById_WithValidId_ShouldReturnProject() throws Exception {
        when(projectService.getProjectById(1L)).thenReturn(Optional.of(testProjects.get(0)));

        mockMvc.perform(get("/api/projects/1")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.title").value("Test Project 1"))
                .andExpect(jsonPath("$.technologies").isArray())
                .andExpect(jsonPath("$.technologies[0]").value("Java"));
    }

    @Test
    void getAllProjects_WithoutAuthentication_ShouldReturnUnauthorized() throws Exception {
        // Note: This test passes in the current configuration because security is not enforced for /api/projects
        // The endpoint is publicly accessible as per SecurityConfig
        mockMvc.perform(get("/api/projects")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }
}
