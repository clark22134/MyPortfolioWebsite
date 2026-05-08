package com.portfolio.backend.chatbot;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import reactor.core.publisher.Flux;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link RagService} retrieval, ranking, citation, and
 * streaming behavior. The {@link ChatClient} is mocked with deep stubs to
 * avoid hitting OpenAI, and the {@link VectorStore} returns deterministic
 * documents so we can assert ordering and citation indices.
 */
class RagServiceTest {

    private VectorStore vectorStore;
    private ChatClient chatClient;
    private RagService rag;

    @BeforeEach
    void setUp() {
        vectorStore = mock(VectorStore.class);
        chatClient = mock(ChatClient.class, RETURNS_DEEP_STUBS);
        rag = new RagService(vectorStore, chatClient);
    }

    @Test
    void answer_returnsContentAndCitationsInPriorityOrder() {
        // Three docs from different categories; "documentation" has lowest priority,
        // "about" has highest. Reranker should place about first.
        Document docs1 = doc("Architecture overview text", "documentation",
                "ARCHITECTURE", "Overview", "docs/ARCHITECTURE.md");
        Document docs2 = doc("Clark is a former Marine and CFI.", "about",
                "About Clark", "Background", "knowledge/about.md");
        Document docs3 = doc("Built an ATS application.", "projects",
                "Projects", "ATS", "knowledge/projects.md");
        when(vectorStore.similaritySearch(any(SearchRequest.class)))
                .thenReturn(List.of(docs1, docs2, docs3));

        when(chatClient.prompt()
                .system(anyString())
                .user(anyString())
                .advisors(any(Consumer.class))
                .call()
                .content()).thenReturn("Clark is a Marine [1] who builds ATS apps [2].");

        RagService.ChatAnswer ans = rag.answer("Tell me about Clark", "conv-1");

        assertThat(ans.content()).contains("[1]").contains("[2]");
        assertThat(ans.citations()).hasSize(3);
        // Highest priority category ("about") should be cited first.
        assertThat(ans.citations().get(0).title()).isEqualTo("About Clark");
        assertThat(ans.citations().get(1).title()).isEqualTo("Projects");
        assertThat(ans.citations().get(2).title()).isEqualTo("ARCHITECTURE");
        // Indices are 1-based and sequential.
        assertThat(ans.citations().get(0).index()).isEqualTo(1);
        assertThat(ans.citations().get(2).index()).isEqualTo(3);
    }

    @Test
    void answer_withEmptyVectorStore_stillCallsLlmWithNoPassages() {
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of());
        when(chatClient.prompt()
                .system(anyString())
                .user(anyString())
                .advisors(any(Consumer.class))
                .call()
                .content()).thenReturn("I don't have information about that yet.");

        RagService.ChatAnswer ans = rag.answer("Anything?", null);

        assertThat(ans.citations()).isEmpty();
        assertThat(ans.content()).contains("don't have information");
    }

    @Test
    void answer_dedupesSameSourceAndSection() {
        // Two near-duplicate hits for same source+section: only one should survive.
        Document d1 = doc("First chunk", "projects", "Projects", "ATS", "knowledge/projects.md");
        Document d2 = doc("Same source", "projects", "Projects", "ATS", "knowledge/projects.md");
        Document d3 = doc("Different section", "projects", "Projects", "Ecommerce", "knowledge/projects.md");
        when(vectorStore.similaritySearch(any(SearchRequest.class)))
                .thenReturn(List.of(d1, d2, d3));

        when(chatClient.prompt()
                .system(anyString())
                .user(anyString())
                .advisors(any(Consumer.class))
                .call()
                .content()).thenReturn("ok");

        RagService.ChatAnswer ans = rag.answer("projects?", "c");
        assertThat(ans.citations()).hasSize(2);
        assertThat(ans.citations()).extracting(Citation::section)
                .containsExactlyInAnyOrder("ATS", "Ecommerce");
    }

    @Test
    void answer_swallowsVectorStoreErrors() {
        when(vectorStore.similaritySearch(any(SearchRequest.class)))
                .thenThrow(new RuntimeException("simulated outage"));
        when(chatClient.prompt()
                .system(anyString())
                .user(anyString())
                .advisors(any(Consumer.class))
                .call()
                .content()).thenReturn("fallback");

        RagService.ChatAnswer ans = rag.answer("q", "c");

        assertThat(ans.citations()).isEmpty();
        assertThat(ans.content()).isEqualTo("fallback");
    }

    @Test
    void stream_emitsTokensAndPopulatesCitationsSink() {
        Document d = doc("body", "about", "About", "Background", "knowledge/about.md");
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of(d));

        when(chatClient.prompt()
                .system(anyString())
                .user(anyString())
                .advisors(any(Consumer.class))
                .stream()
                .content()).thenReturn(Flux.just("Hello", " ", "world"));

        List<Citation> sink = new ArrayList<>();
        Flux<String> tokens = rag.stream("hi", "conv", sink);

        List<String> collected = tokens.collectList().block();
        assertThat(collected).containsExactly("Hello", " ", "world");

        assertThat(sink).hasSize(1);
        assertThat(sink.get(0).source()).isEqualTo("knowledge/about.md");
    }

    @Test
    void answer_truncatesOverlongQuestion() {
        // Build a 2000-char question; the service truncates to MAX_QUESTION_CHARS=1000.
        // This test exercises the path without asserting the prompt body (private),
        // but it must not throw.
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of());
        when(chatClient.prompt()
                .system(anyString())
                .user(anyString())
                .advisors(any(Consumer.class))
                .call()
                .content()).thenReturn("ok");

        String huge = "x".repeat(2000);
        RagService.ChatAnswer ans = rag.answer(huge, "c");
        assertThat(ans.content()).isEqualTo("ok");
    }

    private static Document doc(String text, String category, String title,
                                String section, String source) {
        Map<String, Object> meta = Map.of(
                "category", category,
                "title", title,
                "section", section,
                "source", source);
        return new Document(text, meta);
    }
}
