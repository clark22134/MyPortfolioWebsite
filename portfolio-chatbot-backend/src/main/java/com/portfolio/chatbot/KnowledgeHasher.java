package com.portfolio.chatbot;

import org.springframework.ai.document.Document;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

/** SHA-256 over the ordered chunk texts (the embedding inputs). */
public final class KnowledgeHasher {

    private KnowledgeHasher() {
    }

    public static String contentHash(List<Document> chunks) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            for (Document c : chunks) {
                md.update(c.getText().getBytes(StandardCharsets.UTF_8));
                md.update((byte) '\n');
            }
            return HexFormat.of().formatHex(md.digest());
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
