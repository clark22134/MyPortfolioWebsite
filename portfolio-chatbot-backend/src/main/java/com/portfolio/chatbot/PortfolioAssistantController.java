package com.portfolio.chatbot;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Public REST endpoint for the portfolio AI assistant.
 *
 * <p>Mounted at {@code /api/chatbot/**}. Per-IP rate limiting prevents abuse.
 * If Spring AI is not configured (no API key, or {@code chatbot.enabled=false}),
 * the {@link RagService} bean is absent and every endpoint returns
 * {@code 503 Service Unavailable} with a friendly message — the Lambda
 * still starts cleanly so {@code /health} can report status.</p>
 */
@RestController
@RequestMapping("/api/chatbot")
public class PortfolioAssistantController {

    private static final Logger log = LoggerFactory.getLogger(PortfolioAssistantController.class);

    private final ObjectProvider<RagService> ragServiceProvider;
    private final int requestsPerMinute;
    private final int maxTrackedIps;
    private final boolean enabled;
    private final ObjectMapper objectMapper;
    private final Map<String, Window> ipWindows = new ConcurrentHashMap<>();

    public PortfolioAssistantController(
            ObjectProvider<RagService> ragServiceProvider,
            @Value("${chatbot.enabled:true}") boolean enabled,
            @Value("${chatbot.rate-limit.per-minute:20}") int requestsPerMinute,
            @Value("${chatbot.rate-limit.max-tracked-ips:10000}") int maxTrackedIps,
            ObjectMapper objectMapper) {
        this.ragServiceProvider = ragServiceProvider;
        this.enabled = enabled;
        this.requestsPerMinute = requestsPerMinute;
        this.maxTrackedIps = maxTrackedIps;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        boolean available = enabled && ragServiceProvider.getIfAvailable() != null;
        return ResponseEntity.ok(Map.of(
                "status", available ? "UP" : "DEGRADED",
                "available", available,
                "enabled", enabled,
                "name", "Portfolio Assistant"
        ));
    }

    @PostMapping(value = "/message", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> message(@Valid @RequestBody ChatRequest request, HttpServletRequest http) {
        RagService rag = ragServiceProvider.getIfAvailable();
        if (!enabled || rag == null) {
            return unavailable();
        }
        if (!allow(clientIp(http))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many requests. Please slow down."));
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
                    .body(Map.of("error", "Sorry, I hit an error. Please try again."));
        }
    }

    /**
     * SSE streaming endpoint — compatible with AWS Lambda proxy integration.
     *
     * <p>The {@code aws-serverless-java-container} library buffers the entire
     * HTTP response before returning it to API Gateway; asynchronous
     * {@link org.springframework.web.servlet.mvc.method.annotation.SseEmitter}
     * callbacks run on a Reactor scheduler thread and race with the container's
     * response capture, so only the first token (or none) reaches the client.
     *
     * <p>The fix: collect all tokens synchronously with
     * {@code Flux.collectList().block()}, build the complete SSE body as a
     * plain string, and return it as {@code ResponseEntity<String>}. The
     * frontend's {@code consumeSse} reads from {@code response.body}
     * (a {@code ReadableStream}) and processes all events correctly even when
     * they arrive in a single buffered chunk.
     */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<String> stream(@Valid @RequestBody ChatRequest request, HttpServletRequest http) {
        RagService rag = ragServiceProvider.getIfAvailable();

        if (!enabled || rag == null) {
            return sseResponse(sseEvent("error", "Chatbot is not configured.") + sseEvent("done", ""));
        }
        if (!allow(clientIp(http))) {
            return sseResponse(sseEvent("error", "Too many requests. Please slow down.") + sseEvent("done", ""));
        }

        List<Citation> citations = new ArrayList<>();
        List<String> tokenList;
        try {
            tokenList = rag.stream(request.message(), request.conversationId(), citations)
                    .collectList()
                    .block();
        } catch (Exception e) {
            log.error("Chatbot stream error", e);
            return sseResponse(sseEvent("error", "Sorry, I hit an error.") + sseEvent("done", ""));
        }

        StringBuilder body = new StringBuilder();
        if (tokenList != null) {
            for (String chunk : tokenList) {
                body.append(sseEvent("token", chunk));
            }
        }
        try {
            body.append(sseEvent("citations", objectMapper.writeValueAsString(citations)));
        } catch (Exception e) {
            log.warn("Could not serialize citations", e);
            body.append(sseEvent("citations", "[]"));
        }
        body.append(sseEvent("done", ""));

        return sseResponse(body.toString());
    }

    // ---------- helpers ----------

    /**
     * Format a single SSE event. Multi-line data values are split into
     * multiple {@code data:} lines per the SSE spec.
     */
    private static String sseEvent(String name, String data) {
        StringBuilder sb = new StringBuilder();
        sb.append("event:").append(name).append("\n");
        if (data != null && !data.isEmpty()) {
            for (String line : data.split("\n", -1)) {
                sb.append("data:").append(line).append("\n");
            }
        } else {
            sb.append("data:\n");
        }
        sb.append("\n");
        return sb.toString();
    }

    private static ResponseEntity<String> sseResponse(String body) {
        // Explicitly declare UTF-8. Spring's StringHttpMessageConverter defaults
        // to ISO-8859-1 for text/* types, which mangles multi-byte characters
        // (em-dash, curly quotes, etc.) coming from the OpenAI token stream.
        MediaType utf8Sse = new MediaType(MediaType.TEXT_EVENT_STREAM, StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .contentType(utf8Sse)
                .body(body);
    }

    private boolean allow(String ip) {
        Instant now = Instant.now();
        // Bound memory: ipWindows is an in-memory map that would otherwise grow
        // without limit (a client can rotate X-Forwarded-For values to mint an
        // unbounded number of entries). At the cap, evict windows whose 60s
        // bucket has already elapsed; if the table is still full of live windows,
        // refuse to track a new IP and shed load (fail closed) rather than grow
        // past the cap. Already-tracked IPs are unaffected.
        if (ipWindows.size() >= maxTrackedIps) {
            ipWindows.values().removeIf(window -> window.windowStart.plusSeconds(60).isBefore(now));
            if (ipWindows.size() >= maxTrackedIps && !ipWindows.containsKey(ip)) {
                return false;
            }
        }
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
                "error", "Chatbot is not configured.",
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
