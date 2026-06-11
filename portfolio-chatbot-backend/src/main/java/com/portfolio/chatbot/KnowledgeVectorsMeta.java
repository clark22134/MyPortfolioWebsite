package com.portfolio.chatbot;

/** Sidecar metadata for the committed precomputed vectors. */
public record KnowledgeVectorsMeta(String embeddingModel, String kbContentHash, int chunkCount) {
}
