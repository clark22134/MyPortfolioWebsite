package com.portfolio.chatbot;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = PortfolioAssistantController.class,
        excludeAutoConfiguration = {
                SecurityAutoConfiguration.class,
                SecurityFilterAutoConfiguration.class
        })
@AutoConfigureMockMvc(addFilters = false)
@TestPropertySource(properties = {
        "chatbot.enabled=false",
        "chatbot.rate-limit.per-minute=20"
})
class PortfolioAssistantControllerDisabledTest {

    @Autowired
    private MockMvc mockMvc;

    // Bean exists for slice wiring but endpoint behavior should still respect chatbot.enabled=false.
    @MockitoBean
    private RagService ragService;

    private final ObjectMapper json = new ObjectMapper();

    @Test
    void health_reportsDegradedWhenDisabled() throws Exception {
        mockMvc.perform(get("/api/chatbot/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(false))
                .andExpect(jsonPath("$.enabled").value(false))
                .andExpect(jsonPath("$.status").value("DEGRADED"));
    }

    @Test
    void message_returns503WhenDisabled() throws Exception {
        mockMvc.perform(post("/api/chatbot/message")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("message", "Hello"))))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error").value("Chatbot is not configured."));
    }

    @Test
    void stream_returnsErrorEventWhenDisabled() throws Exception {
        mockMvc.perform(post("/api/chatbot/stream")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("message", "Hello"))))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_EVENT_STREAM))
                .andExpect(content().string(containsString("event:error")))
                .andExpect(content().string(containsString("Chatbot is not configured.")))
                .andExpect(content().string(containsString("event:done")));
    }
}
