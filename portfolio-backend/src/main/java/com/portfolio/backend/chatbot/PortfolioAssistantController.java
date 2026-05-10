package com.portfolio.backend.chatbot;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.publisher.Flux;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Public REST endpoint for the portfolio AI assistant.
 *
 * <p>Mounted at {@code /api/chatbot/**} which is whitelisted in
 * {@link com.portfolio.backend.config.SecurityConfig} as a public,
 * read-only endpoint. Per-IP rate limiting prevents abuse.</p>
 *
 * <p>If Spring AI is not configured (no API key, or {@code chatbot.enabled=false}),
 * the {@link RagService} bean is absent and every endpoint returns
 * {@code 503 Service Unavailable} with a friendly message — the rest of the
 * site keeps working normally.</p>
 */
@RestController
@RequestMapping("/api/chatbot")
public class PortfolioAssistantController {

    private static final Logger log = LoggerFactory.getLogger(PortfolioAssistantController.class);
    private static final long STREAM_TIMEOUT_MS = 60_000L;
    private static final String ERROR_KEY = "error";

    private final ObjectProvider<RagService> ragServiceProvider;
    private final int requestsPerMinute;
    private final boolean enabled;
    private final Map<String, Window> ipWindows = new ConcurrentHashMap<>();

    public PortfolioAssistantController(
            ObjectProvider<RagService> ragServiceProvider,
            @Value("${chatbot.enabled:true}") boolean enabled,
            @Value("${chatbot.rate-limit.per-minute:20}") int requestsPerMinute) {
        this.ragServiceProvider = ragServiceProvider;
        this.enabled = enabled;
        this.requestsPerMinute = requestsPerMinute;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        boolean available = enabled && ragServiceProvider.getIfAvailable() != null;
        return ResponseEntity.ok(Map.of(
                "available", available,
                "enabled", enabled,
                "name", "Portfolio Assistant"
        ));
    }

    /** Non-streaming endpoint. Useful for clients that can't consume SSE. */
    @PostMapping(value = "/message", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> message(@Valid @RequestBody ChatRequest request, HttpServletRequest http) {
        RagService rag = ragServiceProvider.getIfAvailable();
        if (!enabled || rag == null) {
            return unavailable();
        }
        if (!allow(clientIp(http))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of(ERROR_KEY, "Too many requests. Please slow down."));
        }
        try {
            RagService.ChatAnswer ans = rag.answer(request.message(), request.conversationId());
            return ResponseEntity.ok(Map.of(
                    "content", ans.content(),
                    "citations", ans.citations(),
                    "conversationId", request.conversationId() != null ? request.conversationId() : UUID.randomUUID().toString()
            ));
        } catch (Exception e) {
            log.error("Chatbot error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(ERROR_KEY, "Sorry, I hit an error. Please try again."));
        }
    }

    /**
     * SSE streaming endpoint. Emits {@code token} events with text deltas
     * and a final {@code citations} event with the JSON list of citations,
     * then a {@code done} event.
     */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@Valid @RequestBody ChatRequest request, HttpServletRequest http) {
        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MS);
        RagService rag = ragServiceProvider.getIfAvailable();

        if (!enabled || rag == null) {
            sendAndComplete(emitter, ERROR_KEY, "Chatbot is not configured.");
            return emitter;
        }
        if (!allow(clientIp(http))) {
            sendAndComplete(emitter, ERROR_KEY, "Too many requests. Please slow down.");
            return emitter;
        }

        List<Citation> citations = new ArrayList<>();
        Flux<String> tokens;
        try {
            tokens = rag.stream(request.message(), request.conversationId(), citations);
        } catch (Exception e) {
            log.error("Chatbot stream init failed", e);
            sendAndComplete(emitter, ERROR_KEY, "Sorry, I hit an error.");
            return emitter;
        }

        tokens.subscribe(
                chunk -> safeSend(emitter, "token", chunk),
                err -> {
                    log.warn("Chatbot stream error: {}", err.getMessage());
                    sendAndComplete(emitter, ERROR_KEY, "Stream interrupted.");
                },
                () -> {
                    safeSend(emitter, "citations", citations);
                    sendAndComplete(emitter, "done", "");
                }
        );
        return emitter;
    }

    // ---------- helpers ----------

    private static void safeSend(SseEmitter emitter, String event, Object data) {
        try {
            emitter.send(SseEmitter.event().name(event).data(data));
        } catch (IOException ignored) {
            // client disconnected
        }
    }

    private static void sendAndComplete(SseEmitter emitter, String event, Object data) {
        safeSend(emitter, event, data);
        emitter.complete();
    }

    private boolean allow(String ip) {
        Instant now = Instant.now();
        Window w = ipWindows.compute(ip, (k, existing) -> {
            if (existing == null || existing.windowStart.plusSeconds(60).isBefore(now)) {
                return new Window(now, 1);
            }
            return new Window(existing.windowStart, existing.count + 1);
        });
        return w.count <= requestsPerMinute;
    }

    private static String clientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            int comma = xff.indexOf(',');
            return (comma > 0 ? xff.substring(0, comma) : xff).trim();
        }
        return req.getRemoteAddr() == null ? "unknown" : req.getRemoteAddr();
    }

    private static ResponseEntity<Map<String, Object>> unavailable() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                ERROR_KEY, "Chatbot is not configured.",
                "hint", "Set OPENAI_API_KEY and chatbot.enabled=true to enable."
        ));
    }

    public record ChatRequest(
            @NotBlank @Size(max = 1000) String message,
            @Size(max = 64) String conversationId) {
    }

    private record Window(Instant windowStart, int count) {
    }
}
