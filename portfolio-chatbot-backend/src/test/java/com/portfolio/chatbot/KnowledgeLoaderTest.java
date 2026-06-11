package com.portfolio.chatbot;

import org.junit.jupiter.api.Test;
import org.springframework.ai.document.Document;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class KnowledgeLoaderTest {

    private final KnowledgeLoader loader = new KnowledgeLoader("docs");

    @Test
    void loadsChunksFromBundledKnowledge() throws Exception {
        List<Document> chunks = loader.loadChunks();
        assertThat(chunks).isNotEmpty();
        assertThat(chunks).allSatisfy(c -> {
            assertThat(c.getText()).isNotBlank();
            assertThat(c.getMetadata().get("source")).isNotNull();
        });
    }

    @Test
    void chunkOrderAndIdsAreDeterministic() throws Exception {
        List<String> idsA = loader.loadChunks().stream().map(Document::getId).toList();
        List<String> idsB = loader.loadChunks().stream().map(Document::getId).toList();
        assertThat(idsA).isEqualTo(idsB);
        assertThat(idsA).doesNotHaveDuplicates();
    }

    @Test
    void chunkTextOrderIsDeterministic() throws Exception {
        List<String> textsA = loader.loadChunks().stream().map(Document::getText).toList();
        List<String> textsB = loader.loadChunks().stream().map(Document::getText).toList();
        assertThat(textsA).isEqualTo(textsB);
    }
}
