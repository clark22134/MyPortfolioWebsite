package com.portfolio.chatbot;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.portfolio.chatbot.support.FakeEmbeddingModel;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SimpleVectorStore;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class KnowledgeVectorGeneratorTest {

    @Test
    void writesVectorsAndMetaMatchingTheKbHash(@TempDir Path tmp) throws Exception {
        FakeEmbeddingModel embedding = new FakeEmbeddingModel(false);
        SimpleVectorStore store = SimpleVectorStore.builder(embedding).build();
        KnowledgeLoader loader = new KnowledgeLoader("docs");

        KnowledgeVectorGenerator generator =
                new KnowledgeVectorGenerator(store, loader, "text-embedding-3-small", tmp.toString());

        Path vectors = tmp.resolve("knowledge-vectors.json");
        Path meta = tmp.resolve("knowledge-vectors.meta.json");
        generator.generate(vectors, meta);

        assertThat(Files.exists(vectors)).isTrue();
        assertThat(Files.exists(meta)).isTrue();
        assertThat(embedding.calls()).isGreaterThan(0);

        List<Document> chunks = loader.loadChunks();
        KnowledgeVectorsMeta parsed =
                new ObjectMapper().readValue(meta.toFile(), KnowledgeVectorsMeta.class);
        assertThat(parsed.embeddingModel()).isEqualTo("text-embedding-3-small");
        assertThat(parsed.chunkCount()).isEqualTo(chunks.size());
        assertThat(parsed.kbContentHash()).isEqualTo(KnowledgeHasher.contentHash(chunks));
    }
}
