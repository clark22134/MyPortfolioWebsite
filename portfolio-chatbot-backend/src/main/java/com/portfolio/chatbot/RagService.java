package com.portfolio.chatbot;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Retrieval-Augmented Generation pipeline for the portfolio assistant.
 *
 * <p>Pipeline:
 * <ol>
 *   <li><b>Query expansion</b> — expand a small set of acronyms (ATS, RAG,
 *       IaC, etc.) so short queries embed closer to the curated text.</li>
 *   <li><b>Semantic retrieval</b> — top-k=12 from the {@link VectorStore}.</li>
 *   <li><b>Rerank + dedupe</b> — keep best chunk per source/section, prefer
 *       higher-priority categories ({@code about}, {@code projects},
 *       {@code ai-projects}, {@code skills}) on ties.</li>
 *   <li><b>Compose prompt</b> — system instructions + numbered context
 *       passages + the user message. The LLM is told to cite sources by
 *       number.</li>
 *   <li><b>Stream</b> the answer back to the controller.</li>
 * </ol>
 */
@Service
@ConditionalOnBean(ChatClient.class)
public class RagService {

    private static final Logger log = LoggerFactory.getLogger(RagService.class);

    private static final int TOP_K = 12;
    private static final int CONTEXT_PASSAGES = 6;
    private static final int MAX_QUESTION_CHARS = 1000;

    private static final Map<Pattern, String> ACRONYMS = new LinkedHashMap<>() {{
        put(p("\\bATS\\b"), "ATS (Applicant Tracking System)");
        put(p("\\bRAG\\b"), "RAG (Retrieval-Augmented Generation)");
        put(p("\\bIaC\\b"), "IaC (Infrastructure as Code)");
        put(p("\\bCI/CD\\b"), "CI/CD (continuous integration and continuous delivery)");
        put(p("\\bWCAG\\b"), "WCAG (Web Content Accessibility Guidelines)");
        put(p("\\bCFI\\b"), "CFI (Certified Flight Instructor)");
        put(p("\\bUSMC\\b"), "USMC (U.S. Marine Corps)");
    }};

    private static final List<String> CATEGORY_PRIORITY = List.of(
            "about", "projects", "ai-projects",
            "skills", "credentials", "accessibility", "contact", "documentation");

    private static final String SYSTEM_PROMPT = """
            You are the portfolio assistant for Clark Foster's website.
            You help hiring managers, recruiters, engineers, and visitors learn
            about Clark's background, projects, technologies, architecture
            decisions, accessibility work, AI work, and documentation.

            Rules:
            - Use the numbered CONTEXT passages below as your primary source.
              If a question is answerable from the context, answer from it and
              cite sources inline as [1], [2], etc.
            - If the context does not cover the question, answer from your
              general knowledge of the conversation so far but be clear that
              the detail may not be on this page, and suggest the relevant
              section (Projects, AI Projects, Credentials, Contact,
              Accessibility, or Documentation).
            - Be comprehensive: when asked about projects, describe ALL
              projects mentioned in the context, not just one.
            - Be concise and direct. Use short paragraphs and bullet lists.
            - Use markdown for formatting (bold, lists, inline code).
            - Never invent URLs, certifications, employers, or dates.
            - Speak about Clark in the third person.
            """;

    private final VectorStore vectorStore;
    private final ChatClient chatClient;

    public RagService(VectorStore vectorStore, ChatClient portfolioChatClient) {
        this.vectorStore = vectorStore;
        this.chatClient = portfolioChatClient;
    }

    /** Retrieve + answer (blocking, used by the non-streaming endpoint). */
    public ChatAnswer answer(String question, String conversationId) {
        Retrieved r = retrieve(question);
        String prompt = buildUserPrompt(question, r.passages());
        String content = chatClient.prompt()
                .system(SYSTEM_PROMPT)
                .user(prompt)
                .advisors(a -> a.param("chat_memory_conversation_id", safeId(conversationId)))
                .call()
                .content();
        return new ChatAnswer(content, r.citations());
    }

    /** Retrieve + stream the answer token-by-token. Citations are populated into the supplied sink. */
    public Flux<String> stream(String question, String conversationId, List<Citation> citationsSink) {
        Retrieved r = retrieve(question);
        citationsSink.addAll(r.citations());
        String prompt = buildUserPrompt(question, r.passages());
        return chatClient.prompt()
                .system(SYSTEM_PROMPT)
                .user(prompt)
                .advisors(a -> a.param("chat_memory_conversation_id", safeId(conversationId)))
                .stream()
                .content();
    }

    // ---------- internals ----------

    private Retrieved retrieve(String rawQuestion) {
        String question = expand(truncate(rawQuestion));
        List<Document> hits;
        try {
            hits = vectorStore.similaritySearch(SearchRequest.builder()
                    .query(question)
                    .topK(TOP_K)
                    .build());
        } catch (Exception e) {
            log.warn("Vector search failed: {}", e.getMessage());
            return new Retrieved(List.of(), List.of());
        }
        if (hits == null || hits.isEmpty()) {
            return new Retrieved(List.of(), List.of());
        }
        List<Document> ranked = rerankAndDedupe(hits);
        List<Citation> citations = new ArrayList<>(ranked.size());
        List<String> passages = new ArrayList<>(ranked.size());
        for (int i = 0; i < ranked.size(); i++) {
            Document d = ranked.get(i);
            String source = str(d.getMetadata().get("source"));
            String title = str(d.getMetadata().get("title"));
            String section = str(d.getMetadata().get("section"));
            citations.add(new Citation(i + 1, title, section, source));
            passages.add("[" + (i + 1) + "] (" + label(title, section, source) + ")\n" + d.getText());
        }
        return new Retrieved(passages, citations);
    }

    private List<Document> rerankAndDedupe(List<Document> hits) {
        // `hits` is already ordered by cosine similarity (highest first) from the
        // vector store. We deduplicate by source::section preserving that order
        // (LinkedHashMap + putIfAbsent keeps the first / highest-score occurrence
        // per key). We then sort by cosine score descending, using category
        // priority only as a tiebreaker when scores are absent or virtually equal.
        // Previously this sorted solely by category priority, which caused
        // lower-relevance "about" passages to crowd out high-relevance project
        // passages regardless of the query.
        Map<String, Document> bestByKey = new LinkedHashMap<>();
        for (Document d : hits) {
            String key = str(d.getMetadata().get("source")) + "::" + str(d.getMetadata().get("section"));
            bestByKey.putIfAbsent(key, d);
        }
        return bestByKey.values().stream()
                .sorted((a, b) -> {
                    Double sa = a.getScore();
                    Double sb = b.getScore();
                    // Sort by similarity score descending.
                    if (sa != null && sb != null) {
                        double diff = sb - sa;
                        // Use priority only when scores are within 1 % of each other.
                        if (Math.abs(diff) > 0.01) return diff > 0 ? 1 : -1;
                    }
                    // Tiebreaker: prefer higher-priority categories.
                    return Integer.compare(priority(a), priority(b));
                })
                .limit(CONTEXT_PASSAGES)
                .collect(Collectors.toList());
    }

    private static int priority(Document d) {
        String cat = str(d.getMetadata().get("category"));
        int idx = CATEGORY_PRIORITY.indexOf(cat);
        return idx < 0 ? CATEGORY_PRIORITY.size() : idx;
    }

    private static String buildUserPrompt(String question, List<String> passages) {
        StringBuilder sb = new StringBuilder();
        sb.append("CONTEXT:\n");
        if (passages.isEmpty()) {
            sb.append("(no relevant passages found)\n");
        } else {
            for (String p : passages) {
                sb.append(p).append("\n\n");
            }
        }
        sb.append("\nQUESTION: ").append(question).append("\n");
        sb.append("\nAnswer using only the context above and cite sources as [1], [2], etc.");
        return sb.toString();
    }

    private static String expand(String q) {
        String out = q;
        for (Map.Entry<Pattern, String> e : ACRONYMS.entrySet()) {
            Matcher m = e.getKey().matcher(out);
            if (m.find()) {
                out = m.replaceAll(Matcher.quoteReplacement(e.getValue()));
            }
        }
        return out;
    }

    private static String truncate(String q) {
        Objects.requireNonNull(q, "question");
        return q.length() > MAX_QUESTION_CHARS ? q.substring(0, MAX_QUESTION_CHARS) : q;
    }

    private static String safeId(String id) {
        return (id == null || id.isBlank()) ? "anonymous" : id;
    }

    private static String label(String title, String section, String source) {
        if (!title.isEmpty() && !section.isEmpty()) return title + " — " + section;
        if (!title.isEmpty()) return title;
        if (!section.isEmpty()) return section;
        return source;
    }

    private static String str(Object o) {
        return o == null ? "" : o.toString();
    }

    private static Pattern p(String regex) {
        return Pattern.compile(regex);
    }

    public record ChatAnswer(String content, List<Citation> citations) {}

    private record Retrieved(List<String> passages, List<Citation> citations) {}
}
