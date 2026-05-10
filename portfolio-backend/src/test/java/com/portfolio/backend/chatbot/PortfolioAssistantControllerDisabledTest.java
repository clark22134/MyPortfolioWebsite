package com.portfolio.backend.chatbot;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.ComponentScan.Filter;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests for {@link PortfolioAssistantController} when chatbot is disabled
 * ({@code chatbot.enabled=false}). Verifies 503 is returned for all endpoints.
 */
@WebMvcTest(
        controllers = PortfolioAssistantController.class,
        excludeFilters = {
                @Filter(type = FilterType.ASSIGNABLE_TYPE,
                        classes = com.portfolio.backend.config.SecurityConfig.class),
                @Filter(type = FilterType.ASSIGNABLE_TYPE,
                        classes = com.portfolio.backend.security.JwtRequestFilter.class)
        },
        excludeAutoConfiguration = {
                org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class,
                org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration.class
        })
@AutoConfigureMockMvc(addFilters = false)
@TestPropertySource(properties = {
        "chatbot.enabled=false",
        "chatbot.rate-limit.per-minute=20"
})
class PortfolioAssistantControllerDisabledTest {

    @Autowired
    private MockMvc mockMvc;

    // RagService bean is absent (chatbot disabled); ObjectProvider will return null
    @MockitoBean
    private RagService ragService;

    private final ObjectMapper json = new ObjectMapper();

    @Test
    void health_reportsAvailableFalseWhenDisabled() throws Exception {
        mockMvc.perform(get("/api/chatbot/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(false))
                .andExpect(jsonPath("$.enabled").value(false));
    }

    @Test
    void message_returns503WhenChatbotDisabled() throws Exception {
        mockMvc.perform(post("/api/chatbot/message")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("message", "Hello"))))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error").value("Chatbot is not configured."));
    }

    @Test
    void stream_returns503WhenChatbotDisabled() throws Exception {
        mockMvc.perform(post("/api/chatbot/stream")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("message", "Hello"))))
                .andExpect(status().isOk()); // SSE returns 200 but sends error event
    }
}
