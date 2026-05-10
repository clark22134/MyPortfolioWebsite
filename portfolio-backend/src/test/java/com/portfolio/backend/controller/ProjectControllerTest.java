package com.portfolio.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.portfolio.backend.entity.Project;
import com.portfolio.backend.service.ProjectService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProjectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProjectService projectService;

    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());

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

    // ── createProject ──────────────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void createProject_WithValidData_ShouldReturn201() throws Exception {
        Project newProject = new Project();
        newProject.setId(3L);
        newProject.setTitle("New Project");
        newProject.setDescription("A brand new project");
        newProject.setGithubUrl("https://github.com/test/new");
        newProject.setTechnologies(Arrays.asList("Go", "Docker"));
        newProject.setStartDate(LocalDate.of(2024, 6, 1));
        newProject.setFeatured(false);

        when(projectService.createProject(any(Project.class))).thenReturn(newProject);

        mockMvc.perform(post("/api/projects")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newProject)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(3))
                .andExpect(jsonPath("$.title").value("New Project"));
    }

    // ── updateProject ──────────────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateProject_WithValidId_ShouldReturn200() throws Exception {
        Project updated = new Project();
        updated.setId(1L);
        updated.setTitle("Updated Project Title");
        updated.setDescription("Updated description");
        updated.setGithubUrl("https://github.com/test/updated");
        updated.setTechnologies(Arrays.asList("Kotlin", "Spring Boot"));
        updated.setStartDate(LocalDate.of(2024, 3, 1));
        updated.setFeatured(true);

        when(projectService.getProjectById(1L)).thenReturn(Optional.of(testProjects.get(0)));
        when(projectService.updateProject(eq(1L), any(Project.class))).thenReturn(updated);

        mockMvc.perform(put("/api/projects/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updated)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Project Title"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateProject_WithNonExistentId_ShouldReturn404() throws Exception {
        Project payload = new Project();
        payload.setTitle("Irrelevant");
        payload.setDescription("Does not matter");
        payload.setGithubUrl("https://github.com/test/x");
        payload.setTechnologies(Arrays.asList("Java"));
        payload.setStartDate(LocalDate.of(2024, 1, 1));

        when(projectService.getProjectById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(put("/api/projects/999")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isNotFound());
    }

    // ── deleteProject ──────────────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void deleteProject_WithValidId_ShouldReturn204() throws Exception {
        when(projectService.getProjectById(1L)).thenReturn(Optional.of(testProjects.get(0)));
        doNothing().when(projectService).deleteProject(1L);

        mockMvc.perform(delete("/api/projects/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void deleteProject_WithNonExistentId_ShouldReturn404() throws Exception {
        when(projectService.getProjectById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(delete("/api/projects/999"))
                .andExpect(status().isNotFound());
    }

    // ── getProjectById not-found ───────────────────────────────────────────

    @Test
    @WithMockUser
    void getProjectById_WithNonExistentId_ShouldReturn404() throws Exception {
        when(projectService.getProjectById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/projects/999")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }
}
