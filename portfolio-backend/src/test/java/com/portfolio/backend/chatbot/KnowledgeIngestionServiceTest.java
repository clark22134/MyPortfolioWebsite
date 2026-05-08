package com.portfolio.backend.chatbot;

import com.portfolio.backend.repository.ProjectRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link KnowledgeIngestionService}: confirms that curated
 * knowledge ({@code classpath:knowledge/*.md}) AND bundled docs
 * ({@code classpath:docs/*.md}) are loaded into the vector store with the
 * correct metadata, and that front-matter is parsed.
 */
class KnowledgeIngestionServiceTest {

    @Test
    void ingestAll_loadsClasspathKnowledgeAndDocsIntoVectorStore() {
        VectorStore vs = mock(VectorStore.class);
        ProjectRepository repo = mock(ProjectRepository.class);
        when(repo.findAll()).thenReturn(Collections.emptyList());

        // Use a non-existent filesystem path so only classpath sources contribute.
        // This isolates the test from the actual /docs directory state.
        KnowledgeIngestionService svc =
                new KnowledgeIngestionService(vs, repo, "/nonexistent/path/for/test");

        svc.ingestAll();

        ArgumentCaptor<List<Document>> captor = ArgumentCaptor.forClass(List.class);
        verify(vs).add(captor.capture());

        List<Document> chunks = captor.getValue();
        assertThat(chunks).isNotEmpty();

        // Every chunk should carry source + category metadata for citation.
        assertThat(chunks).allSatisfy(d -> {
            assertThat(d.getMetadata()).containsKey("source");
            assertThat(d.getMetadata()).containsKey("category");
        });

        // We expect chunks from BOTH the curated knowledge files and the
        // bundled /docs files. Front-matter can override `source`, so we
        // assert against `category` which is more stable: docs files default
        // to "documentation"; knowledge files default to other categories
        // (about, projects, skills, ...).
        assertThat(chunks).anyMatch(d ->
                "documentation".equals(d.getMetadata().get("category")));
        assertThat(chunks).anyMatch(d ->
                !"documentation".equals(d.getMetadata().get("category")));
    }

    @Test
    void ingestAll_doesNotFailWhenProjectRepoThrows() {
        VectorStore vs = mock(VectorStore.class);
        ProjectRepository repo = mock(ProjectRepository.class);
        when(repo.findAll()).thenThrow(new RuntimeException("DB not ready"));

        KnowledgeIngestionService svc =
                new KnowledgeIngestionService(vs, repo, "/nonexistent/path/for/test");

        // Should swallow the exception; classpath sources still ingest.
        svc.ingestAll();
        verify(vs).add(org.mockito.ArgumentMatchers.anyList());
    }
}
