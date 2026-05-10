package com.portfolio.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests for the interactive project mini-controllers:
 * AnalyticsController, TaskManagerController, ChatbotController, CodePlaygroundController.
 * These are public "coming soon" endpoints — no authentication required.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProjectMiniControllersTest {

    @Autowired
    private MockMvc mockMvc;

    // ── AnalyticsController ───────────────────────────────────────────────

    @Test
    void analyticsStatus_ShouldReturnComingSoonResponse() throws Exception {
        mockMvc.perform(get("/api/projects/analytics/status")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.project").value("Real-Time Analytics"))
                .andExpect(jsonPath("$.status").value("COMING_SOON"));
    }

    @Test
    void analyticsDashboard_ShouldReturnComingSoonResponse() throws Exception {
        mockMvc.perform(get("/api/projects/analytics/dashboard")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.project").value("Real-Time Analytics"))
                .andExpect(jsonPath("$.status").value("COMING_SOON"))
                .andExpect(jsonPath("$.message").exists());
    }

    // ── TaskManagerController ─────────────────────────────────────────────

    @Test
    void taskManagerStatus_ShouldReturnComingSoonResponse() throws Exception {
        mockMvc.perform(get("/api/projects/tasks/status")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.project").value("Task Manager"))
                .andExpect(jsonPath("$.status").value("COMING_SOON"));
    }

    @Test
    void taskManagerBoards_ShouldReturnComingSoonResponse() throws Exception {
        mockMvc.perform(get("/api/projects/tasks/boards")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.project").value("Task Manager"))
                .andExpect(jsonPath("$.status").value("COMING_SOON"))
                .andExpect(jsonPath("$.message").exists());
    }

    // ── ChatbotController ─────────────────────────────────────────────────

    @Test
    void chatbotStatus_ShouldReturnComingSoonResponse() throws Exception {
        mockMvc.perform(get("/api/projects/chatbot/status")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.project").value("AI Chatbot"))
                .andExpect(jsonPath("$.status").value("COMING_SOON"));
    }

    @Test
    @WithMockUser
    void chatbotChat_WithAuth_ShouldReturnComingSoonResponse() throws Exception {
        mockMvc.perform(post("/api/projects/chatbot/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"message\": \"Hello!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.project").value("AI Chatbot"))
                .andExpect(jsonPath("$.status").value("COMING_SOON"));
    }

    // ── CodePlaygroundController ──────────────────────────────────────────

    @Test
    void codePlaygroundStatus_ShouldReturnComingSoonResponse() throws Exception {
        mockMvc.perform(get("/api/projects/playground/status")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.project").value("Code Playground"))
                .andExpect(jsonPath("$.status").value("COMING_SOON"));
    }

    @Test
    @WithMockUser
    void codePlaygroundExecute_WithAuth_ShouldReturnComingSoonResponse() throws Exception {
        mockMvc.perform(post("/api/projects/playground/execute")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"language\": \"java\", \"code\": \"System.out.println(1+1);\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.project").value("Code Playground"))
                .andExpect(jsonPath("$.status").value("COMING_SOON"));
    }

    @Test
    void codePlaygroundLanguages_ShouldReturnSupportedLanguagesList() throws Exception {
        mockMvc.perform(get("/api/projects/playground/languages")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.languages").isArray())
                .andExpect(jsonPath("$.status").value("coming-soon"));
    }
}
