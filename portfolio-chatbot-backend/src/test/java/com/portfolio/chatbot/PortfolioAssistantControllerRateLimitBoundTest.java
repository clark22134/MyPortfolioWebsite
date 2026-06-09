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

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies the rate limiter's per-IP tracking table is bounded: once it is
 * saturated with live windows, a previously-unseen IP is shed (fail closed)
 * rather than growing the map without limit. {@code per-minute} is set high so
 * only the tracking cap — not the request rate — can trip these assertions.
 */
@WebMvcTest(
        controllers = PortfolioAssistantController.class,
        excludeAutoConfiguration = {
                SecurityAutoConfiguration.class,
                SecurityFilterAutoConfiguration.class
        })
@AutoConfigureMockMvc(addFilters = false)
@TestPropertySource(properties = {
        "chatbot.enabled=true",
        "chatbot.rate-limit.per-minute=1000",
        "chatbot.rate-limit.max-tracked-ips=2"
})
class PortfolioAssistantControllerRateLimitBoundTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RagService ragService;

    private final ObjectMapper json = new ObjectMapper();

    @Test
    void newIpIsShedOnceTrackingTableIsSaturated() throws Exception {
        when(ragService.answer(anyString(), any()))
                .thenReturn(new RagService.ChatAnswer("ok", List.of()));

        // Fill the tracking table to its cap (2) with distinct live IPs.
        for (String ip : List.of("1.1.1.1", "2.2.2.2")) {
            mockMvc.perform(messageFrom(ip)).andExpect(status().isOk());
        }

        // A third, previously-unseen IP cannot be tracked without exceeding the
        // cap, so it is shed with 429 even though per-minute is nowhere near hit.
        mockMvc.perform(messageFrom("3.3.3.3")).andExpect(status().isTooManyRequests());

        // An already-tracked IP still succeeds — it does not grow the table.
        mockMvc.perform(messageFrom("1.1.1.1")).andExpect(status().isOk());
    }

    private MockHttpServletRequestBuilder messageFrom(String ip) throws Exception {
        return post("/api/chatbot/message")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("message", "hi")))
                .header("X-Forwarded-For", ip);
    }
}
