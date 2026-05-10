package com.portfolio.backend.chatbot;

import com.portfolio.backend.entity.Project;
import com.portfolio.backend.repository.ProjectRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

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

    @Test
    void ingestAll_loadsFilesystemDocs_whenDirectoryExists(@TempDir Path tmpDir) throws IOException {
        // Write a markdown file with front-matter and headings into a temp dir.
        String markdown = """
                ---
                title: Test Doc
                category: test
                ---
                # Section One
                Content for section one.
                ## Section Two
                Content for section two.
                """;
        Files.writeString(tmpDir.resolve("test.md"), markdown);

        VectorStore vs = mock(VectorStore.class);
        ProjectRepository repo = mock(ProjectRepository.class);
        when(repo.findAll()).thenReturn(Collections.emptyList());

        KnowledgeIngestionService svc =
                new KnowledgeIngestionService(vs, repo, tmpDir.toString());
        svc.ingestAll();

        ArgumentCaptor<List<Document>> captor = ArgumentCaptor.forClass(List.class);
        verify(vs).add(captor.capture());
        List<Document> chunks = captor.getValue();

        // The filesystem doc should have contributed at least one chunk
        assertThat(chunks).anyMatch(d ->
                d.getMetadata().getOrDefault("source", "").toString().contains("test.md"));
    }

    @Test
    void ingestAll_loadsProjectsFromDb() {
        VectorStore vs = mock(VectorStore.class);
        ProjectRepository repo = mock(ProjectRepository.class);

        Project p = new Project();
        p.setId(1L);
        p.setTitle("My Project");
        p.setDescription("A cool project.");
        p.setTechnologies(List.of("Java", "Spring"));
        p.setStartDate(LocalDate.of(2023, 1, 1));
        p.setEndDate(LocalDate.of(2023, 6, 1));
        p.setGithubUrl("https://github.com/example");
        p.setDemoUrl("https://demo.example.com");
        when(repo.findAll()).thenReturn(List.of(p));

        KnowledgeIngestionService svc =
                new KnowledgeIngestionService(vs, repo, "/nonexistent/path/for/test");
        svc.ingestAll();

        ArgumentCaptor<List<Document>> captor = ArgumentCaptor.forClass(List.class);
        verify(vs).add(captor.capture());
        List<Document> chunks = captor.getValue();

        // Project doc should be present with live-project category
        assertThat(chunks).anyMatch(d ->
                "live-project".equals(d.getMetadata().get("category")));
    }

    @Test
    void ingestAll_projectWithNullOptionalFields() {
        VectorStore vs = mock(VectorStore.class);
        ProjectRepository repo = mock(ProjectRepository.class);

        // Project with only required title — all optional fields null
        Project p = new Project();
        p.setId(2L);
        p.setTitle("Minimal Project");
        when(repo.findAll()).thenReturn(List.of(p));

        KnowledgeIngestionService svc =
                new KnowledgeIngestionService(vs, repo, "/nonexistent/path/for/test");

        // Should not throw even with null description, technologies, dates, URLs
        svc.ingestAll();
        verify(vs).add(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    void refreshLiveProjects_doesNothingWhenNoProjects() {
        VectorStore vs = mock(VectorStore.class);
        ProjectRepository repo = mock(ProjectRepository.class);
        when(repo.findAll()).thenReturn(Collections.emptyList());

        KnowledgeIngestionService svc =
                new KnowledgeIngestionService(vs, repo, "/nonexistent/path/for/test");

        svc.refreshLiveProjects();

        // vectorStore.add should NOT be called when there are no projects
        verify(vs, never()).add(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    void refreshLiveProjects_addsProjectDocsToVectorStore() {
        VectorStore vs = mock(VectorStore.class);
        ProjectRepository repo = mock(ProjectRepository.class);

        Project p = new Project();
        p.setId(3L);
        p.setTitle("Refresh Project");
        p.setDescription("Description for refresh.");
        when(repo.findAll())
                // First call from ingestAll(), second from refreshLiveProjects()
                .thenReturn(Collections.emptyList())
                .thenReturn(List.of(p));

        KnowledgeIngestionService svc =
                new KnowledgeIngestionService(vs, repo, "/nonexistent/path/for/test");
        svc.ingestAll(); // clears the first repo call
        reset(vs);       // reset so we only verify the refresh call below

        svc.refreshLiveProjects();
        verify(vs).add(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    void refreshLiveProjects_doesNotFailWhenRepoThrows() {
        VectorStore vs = mock(VectorStore.class);
        ProjectRepository repo = mock(ProjectRepository.class);
        when(repo.findAll())
                .thenReturn(Collections.emptyList())    // ingestAll
                .thenThrow(new RuntimeException("DB down")); // refreshLiveProjects

        KnowledgeIngestionService svc =
                new KnowledgeIngestionService(vs, repo, "/nonexistent/path/for/test");
        svc.ingestAll();
        reset(vs); // clear the ingestAll() invocation so we verify only the refresh

        // Should swallow the exception
        svc.refreshLiveProjects();
        verify(vs, never()).add(org.mockito.ArgumentMatchers.anyList());
    }
}
