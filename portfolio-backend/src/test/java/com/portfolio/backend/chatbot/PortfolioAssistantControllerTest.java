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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-layer slice tests for {@link PortfolioAssistantController}. Uses
 * {@code @WebMvcTest} so we skip loading the Spring AI / OpenAI
 * autoconfiguration stack (which would otherwise require a real API key).
 * Security filters are disabled with {@code addFilters=false} since the
 * endpoint is already public in production.
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
        "chatbot.enabled=true",
        "chatbot.rate-limit.per-minute=2"
})
class PortfolioAssistantControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RagService ragService;

    private final ObjectMapper json = new ObjectMapper();

    @Test
    void health_reportsAvailableTrueWhenBeanPresentAndEnabled() throws Exception {
        mockMvc.perform(get("/api/chatbot/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.enabled").value(true));
    }

    @Test
    void message_returnsAnswerAndCitations() throws Exception {
        when(ragService.answer(anyString(), any())).thenReturn(
                new RagService.ChatAnswer(
                        "Clark builds web apps [1].",
                        List.of(new Citation(1, "About", "Background", "knowledge/about.md"))));

        mockMvc.perform(postJson("/api/chatbot/message",
                        Map.of("message", "What does Clark do?", "conversationId", "c1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Clark builds web apps [1]."))
                .andExpect(jsonPath("$.citations[0].source").value("knowledge/about.md"))
                .andExpect(jsonPath("$.conversationId").value("c1"));
    }

    @Test
    void message_blankMessageFailsValidation() throws Exception {
        mockMvc.perform(postJson("/api/chatbot/message", Map.of("message", "")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void message_overlongMessageFailsValidation() throws Exception {
        String huge = "x".repeat(1001);
        mockMvc.perform(postJson("/api/chatbot/message", Map.of("message", huge)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void message_returns429AfterRateLimitExceeded() throws Exception {
        when(ragService.answer(anyString(), any())).thenReturn(
                new RagService.ChatAnswer("ok", List.of()));

        for (int i = 0; i < 2; i++) {
            mockMvc.perform(postJson("/api/chatbot/message", Map.of("message", "hi"))
                            .header("X-Forwarded-For", "10.1.1.1"))
                    .andExpect(status().isOk());
        }
        mockMvc.perform(postJson("/api/chatbot/message", Map.of("message", "hi"))
                        .header("X-Forwarded-For", "10.1.1.1"))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void stream_returnsSseContentType() throws Exception {
        when(ragService.stream(anyString(), any(), any()))
                .thenReturn(Flux.just("hi"));

        mockMvc.perform(post("/api/chatbot/stream")
                        .header("X-Forwarded-For", "10.2.2.2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("message", "hello"))))
                .andExpect(status().isOk());
    }

    private MockHttpServletRequestBuilder postJson(String url, Object body) throws Exception {
        return post(url)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body));
    }
}
