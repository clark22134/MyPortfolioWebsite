package com.portfolio.chatbot;

import org.junit.jupiter.api.Test;
import org.springframework.ai.document.Document;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class KnowledgeHasherTest {

    private static Document doc(String text) {
        return new Document(text);
    }

    @Test
    void hashIsStableForSameOrderedTexts() {
        String a = KnowledgeHasher.contentHash(List.of(doc("alpha"), doc("beta")));
        String b = KnowledgeHasher.contentHash(List.of(doc("alpha"), doc("beta")));
        assertThat(a).isEqualTo(b).hasSize(64);
    }

    @Test
    void hashChangesWhenTextChanges() {
        String a = KnowledgeHasher.contentHash(List.of(doc("alpha"), doc("beta")));
        String c = KnowledgeHasher.contentHash(List.of(doc("alpha"), doc("BETA")));
        assertThat(a).isNotEqualTo(c);
    }

    @Test
    void hashIsOrderSensitive() {
        String a = KnowledgeHasher.contentHash(List.of(doc("alpha"), doc("beta")));
        String d = KnowledgeHasher.contentHash(List.of(doc("beta"), doc("alpha")));
        assertThat(a).isNotEqualTo(d);
    }
}
