package com.portfolio.chatbot;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.ai.document.Document;
import org.springframework.core.io.ClassPathResource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Keyless build-time guard: the committed knowledge-vectors.json / .meta.json
 * must match the current KB markdown and the configured embedding model.
 * If this fails, run scripts/generate-chatbot-kb.sh and commit the result.
 */
class KnowledgeVectorsFreshnessTest {

    private static final String EXPECTED_MODEL = "text-embedding-3-small";

    @Test
    void committedVectorsMatchCurrentKb() throws Exception {
        List<Document> chunks = new KnowledgeLoader("docs").loadChunks();
        String expectedHash = KnowledgeHasher.contentHash(chunks);

        ClassPathResource vectors = new ClassPathResource("knowledge-vectors.json");
        ClassPathResource metaRes = new ClassPathResource("knowledge-vectors.meta.json");

        assertThat(vectors.exists())
                .as("knowledge-vectors.json missing — run scripts/generate-chatbot-kb.sh and commit")
                .isTrue();
        assertThat(metaRes.exists())
                .as("knowledge-vectors.meta.json missing — run scripts/generate-chatbot-kb.sh and commit")
                .isTrue();

        KnowledgeVectorsMeta meta =
                new ObjectMapper().readValue(metaRes.getInputStream(), KnowledgeVectorsMeta.class);

        assertThat(meta.kbContentHash())
                .as("Chatbot KB changed — regenerate via scripts/generate-chatbot-kb.sh and commit "
                        + "knowledge-vectors.json + knowledge-vectors.meta.json")
                .isEqualTo(expectedHash);
        assertThat(meta.chunkCount())
                .as("Committed chunkCount drifted from current KB")
                .isEqualTo(chunks.size());
        assertThat(meta.embeddingModel())
                .as("Committed vectors were built with a different embedding model")
                .isEqualTo(EXPECTED_MODEL);
    }
}
