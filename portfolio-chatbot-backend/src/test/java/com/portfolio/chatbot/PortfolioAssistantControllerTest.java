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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
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
    void health_reportsAvailableTrueWhenEnabledAndServicePresent() throws Exception {
        mockMvc.perform(get("/api/chatbot/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void message_returnsAnswerAndCitations() throws Exception {
        when(ragService.answer(anyString(), any())).thenReturn(
                new RagService.ChatAnswer(
                        "Clark builds resilient systems [1].",
                        List.of(new Citation(1, "About", "Background", "knowledge/about.md"))));

        mockMvc.perform(postJson("/api/chatbot/message",
                        Map.of("message", "What does Clark build?", "conversationId", "c1"))
                        .header("X-Forwarded-For", "10.1.1.1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Clark builds resilient systems [1]."))
                .andExpect(jsonPath("$.citations[0].source").value("knowledge/about.md"))
                .andExpect(jsonPath("$.conversationId").value("c1"));
    }

    @Test
    void message_returns500WhenRagServiceThrows() throws Exception {
        when(ragService.answer(anyString(), any())).thenThrow(new RuntimeException("boom"));

        mockMvc.perform(postJson("/api/chatbot/message", Map.of("message", "hi"))
                        .header("X-Forwarded-For", "10.1.1.2"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Sorry, I hit an error. Please try again."));
    }

    @Test
    void message_returns429AfterRateLimitExceeded() throws Exception {
        when(ragService.answer(anyString(), any())).thenReturn(
                new RagService.ChatAnswer("ok", List.of()));

        for (int i = 0; i < 2; i++) {
            mockMvc.perform(postJson("/api/chatbot/message", Map.of("message", "hi"))
                            .header("X-Forwarded-For", "10.10.10.10"))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(postJson("/api/chatbot/message", Map.of("message", "hi"))
                        .header("X-Forwarded-For", "10.10.10.10"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error").value("Too many requests. Please slow down."));
    }

    @Test
    void stream_returnsBufferedSseBodyWithTokensCitationsAndDone() throws Exception {
        when(ragService.stream(anyString(), any(), any())).thenAnswer(invocation -> {
            List<Citation> sink = invocation.getArgument(2);
            sink.add(new Citation(1, "Projects", "ATS", "knowledge/projects.md"));
            return Flux.just("Hello", " world");
        });

        mockMvc.perform(postJson("/api/chatbot/stream", Map.of("message", "Tell me about projects"))
                        .header("X-Forwarded-For", "10.1.1.3"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_EVENT_STREAM))
                .andExpect(content().string(containsString("event:token")))
                .andExpect(content().string(containsString("data:Hello")))
                .andExpect(content().string(containsString("event:citations")))
                .andExpect(content().string(containsString("knowledge/projects.md")))
                .andExpect(content().string(containsString("event:done")));
    }

    @Test
    void stream_returnsErrorEventWhenRagServiceThrows() throws Exception {
        when(ragService.stream(anyString(), any(), any())).thenThrow(new RuntimeException("stream error"));

        mockMvc.perform(postJson("/api/chatbot/stream", Map.of("message", "hello"))
                        .header("X-Forwarded-For", "10.1.1.4"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("event:error")))
                .andExpect(content().string(containsString("Sorry, I hit an error.")))
                .andExpect(content().string(containsString("event:done")));
    }

    @Test
    void stream_returnsRateLimitErrorAfterLimitExceeded() throws Exception {
        when(ragService.stream(anyString(), any(), any())).thenReturn(Flux.just("ok"));

        for (int i = 0; i < 2; i++) {
            mockMvc.perform(postJson("/api/chatbot/stream", Map.of("message", "hi"))
                            .header("X-Forwarded-For", "10.22.33.44"))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(postJson("/api/chatbot/stream", Map.of("message", "hi"))
                        .header("X-Forwarded-For", "10.22.33.44"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("event:error")))
                .andExpect(content().string(containsString("Too many requests. Please slow down.")));
    }

    @Test
    void message_blankMessageFailsValidation() throws Exception {
        mockMvc.perform(postJson("/api/chatbot/message", Map.of("message", ""))
                        .header("X-Forwarded-For", "10.1.1.5"))
                .andExpect(status().isBadRequest());
    }

    private MockHttpServletRequestBuilder postJson(String url, Object body) throws Exception {
        return post(url)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body));
    }
}
