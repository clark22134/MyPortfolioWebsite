package com.portfolio.chatbot;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SimpleVectorStore;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Populates the in-process {@link SimpleVectorStore} on startup.
 *
 * <p><b>Prod path (no OpenAI calls):</b> if {@code knowledge-vectors.json} is on
 * the classpath, it is deserialized via {@link SimpleVectorStore#load(Resource)}.
 * This keeps the SnapStart Init phase fast and deterministic (the previous
 * per-chunk embedding at startup hit the ~130 s init timeout).
 *
 * <p><b>Local-dev fallback:</b> if the precomputed file is absent, the KB is
 * embedded live via {@link KnowledgeLoader} + {@code add()} (the original
 * behavior). In prod the file is always bundled, so this branch never runs.
 *
 * <p>Any failure is logged at ERROR and swallowed; the Lambda still serves
 * {@code /api/chatbot/health}, returning empty results until the next cold start.
 */
@Service
@ConditionalOnBean(VectorStore.class)
@ConditionalOnExpression(
        "'${chatbot.enabled:true}' == 'true' and !'${spring.ai.openai.api-key:}'.isEmpty()")
public class KnowledgeIngestionService {

    private static final Logger log = LoggerFactory.getLogger(KnowledgeIngestionService.class);

    private final SimpleVectorStore vectorStore;
    private final KnowledgeLoader loader;
    private final Resource vectorsResource;
    private final String embeddingModel;

    public KnowledgeIngestionService(
            SimpleVectorStore vectorStore,
            KnowledgeLoader loader,
            @Value("${chatbot.kb.vectors-resource:classpath:knowledge-vectors.json}") Resource vectorsResource,
            @Value("${spring.ai.openai.embedding.options.model:unknown}") String embeddingModel) {
        this.vectorStore = vectorStore;
        this.loader = loader;
        this.vectorsResource = vectorsResource;
        this.embeddingModel = embeddingModel;
    }

    @PostConstruct
    public void ingestAll() {
        try {
            if (vectorsResource != null && vectorsResource.exists()) {
                vectorStore.load(vectorsResource);
                warnIfModelMismatch();
                log.info("Chatbot KB loaded from precomputed vectors ({})", vectorsResource.getFilename());
                return;
            }
            log.warn("Precomputed vectors not found ({}); falling back to live embedding ingestion",
                    safeName());
            List<Document> chunks = loader.loadChunks();
            if (chunks.isEmpty()) {
                log.warn("Chatbot knowledge ingestion produced no documents");
                return;
            }
            vectorStore.add(chunks);
            log.info("Chatbot KB ingested live: {} chunks", chunks.size());
        } catch (Exception e) {
            log.error("Chatbot knowledge ingestion failed: {}", e.getMessage(), e);
        }
    }

    private void warnIfModelMismatch() {
        ClassPathResource metaRes = new ClassPathResource("knowledge-vectors.meta.json");
        if (!metaRes.exists()) {
            return;
        }
        try {
            KnowledgeVectorsMeta meta =
                    new ObjectMapper().readValue(metaRes.getInputStream(), KnowledgeVectorsMeta.class);
            if (!embeddingModel.equals(meta.embeddingModel())) {
                log.warn("Precomputed vectors were built with embedding model '{}' but '{}' is configured "
                                + "— query similarity may be degraded",
                        meta.embeddingModel(), embeddingModel);
            }
        } catch (Exception e) {
            log.warn("Could not read knowledge-vectors.meta.json: {}", e.getMessage());
        }
    }

    private String safeName() {
        try {
            return vectorsResource == null ? "null" : vectorsResource.getDescription();
        } catch (Exception e) {
            return "unknown";
        }
    }
}
