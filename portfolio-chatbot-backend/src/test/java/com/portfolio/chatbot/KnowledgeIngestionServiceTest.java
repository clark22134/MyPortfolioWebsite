package com.portfolio.chatbot;

import com.portfolio.chatbot.support.FakeEmbeddingModel;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.SimpleVectorStore;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class KnowledgeIngestionServiceTest {

    /** Build a saved vectors file from two known docs using a fake model. */
    private Path writeFixture(Path tmp, FakeEmbeddingModel embedding) {
        SimpleVectorStore gen = SimpleVectorStore.builder(embedding).build();
        gen.add(List.of(
                new Document("id-1", "Clark built the ATS project.", Map.of("source", "knowledge/projects.md")),
                new Document("id-2", "Clark is a software engineer.", Map.of("source", "knowledge/about.md"))));
        Path file = tmp.resolve("knowledge-vectors.json");
        gen.save(file.toFile());
        return file;
    }

    @Test
    void loadPathPerformsNoEmbedding(@TempDir Path tmp) {
        Path fixture = writeFixture(tmp, new FakeEmbeddingModel(false));

        FakeEmbeddingModel throwing = new FakeEmbeddingModel(true);
        SimpleVectorStore target = SimpleVectorStore.builder(throwing).build();
        Resource res = new FileSystemResource(fixture.toFile());

        KnowledgeIngestionService service =
                new KnowledgeIngestionService(target, new KnowledgeLoader("docs"), res, "text-embedding-3-small");

        assertThatCode(service::ingestAll).doesNotThrowAnyException();
        assertThat(throwing.calls()).isZero();
    }

    @Test
    void loadPathPopulatesStore(@TempDir Path tmp) {
        FakeEmbeddingModel embedding = new FakeEmbeddingModel(false);
        Path fixture = writeFixture(tmp, embedding);

        SimpleVectorStore target = SimpleVectorStore.builder(embedding).build();
        Resource res = new FileSystemResource(fixture.toFile());

        KnowledgeIngestionService service =
                new KnowledgeIngestionService(target, new KnowledgeLoader("docs"), res, "text-embedding-3-small");
        service.ingestAll();

        List<Document> hits = target.similaritySearch(SearchRequest.builder().query("ATS").topK(2).build());
        assertThat(hits).hasSize(2);
    }

    @Test
    void fallsBackToLiveIngestionWhenFileAbsent(@TempDir Path tmp) {
        FakeEmbeddingModel embedding = new FakeEmbeddingModel(false);
        SimpleVectorStore target = SimpleVectorStore.builder(embedding).build();
        Resource missing = new FileSystemResource(tmp.resolve("does-not-exist.json").toFile());

        KnowledgeIngestionService service =
                new KnowledgeIngestionService(target, new KnowledgeLoader("docs"), missing, "text-embedding-3-small");
        service.ingestAll();

        assertThat(embedding.calls()).isGreaterThan(0);
        List<Document> hits = target.similaritySearch(SearchRequest.builder().query("Clark").topK(1).build());
        assertThat(hits).isNotEmpty();
    }
}
