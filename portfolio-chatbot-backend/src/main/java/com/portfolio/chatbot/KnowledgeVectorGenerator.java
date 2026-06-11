package com.portfolio.chatbot;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SimpleVectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

/**
 * Dev-time tool: embeds the KB once and writes {@code knowledge-vectors.json}
 * (+ {@code knowledge-vectors.meta.json}) into the source resources so they can
 * be committed and bundled. Active ONLY under the {@code generate-kb} Spring
 * profile, so it never runs in prod or in tests. Run via
 * {@code scripts/generate-chatbot-kb.sh} (requires network + an OpenAI key).
 */
@Component
@Profile("generate-kb")
public class KnowledgeVectorGenerator implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(KnowledgeVectorGenerator.class);

    private final SimpleVectorStore vectorStore;
    private final KnowledgeLoader loader;
    private final String embeddingModel;
    private final String outDir;

    public KnowledgeVectorGenerator(
            SimpleVectorStore vectorStore,
            KnowledgeLoader loader,
            @Value("${spring.ai.openai.embedding.options.model:unknown}") String embeddingModel,
            @Value("${chatbot.kb.generate.out:src/main/resources}") String outDir) {
        this.vectorStore = vectorStore;
        this.loader = loader;
        this.embeddingModel = embeddingModel;
        this.outDir = outDir;
    }

    /** Embed + persist. Visible for testing with a fake embedding model. */
    public void generate(Path vectorsOut, Path metaOut) throws IOException {
        List<Document> chunks = loader.loadChunks();
        if (chunks.isEmpty()) {
            throw new IllegalStateException("No KB chunks found — nothing to embed");
        }
        // Note: booting this profile also runs KnowledgeIngestionService's
        // @PostConstruct, which live-embeds the same chunks into this shared
        // vectorStore first. That's harmless — chunk ids are deterministic, so
        // these add()s overwrite by id (no duplicates), and only these vectors
        // are saved. The cost is one extra embed pass per regeneration (a rare
        // dev action). Intentional: not worth coupling the prod ingestion bean
        // to this dev-only profile to avoid.
        log.info("Embedding {} chunks with model {} ...", chunks.size(), embeddingModel);
        vectorStore.add(chunks);
        vectorStore.save(vectorsOut.toFile());
        KnowledgeVectorsMeta meta = new KnowledgeVectorsMeta(
                embeddingModel, KnowledgeHasher.contentHash(chunks), chunks.size());
        new ObjectMapper().writerWithDefaultPrettyPrinter().writeValue(metaOut.toFile(), meta);
        log.info("Wrote {} ({} chunks) and {}", vectorsOut, chunks.size(), metaOut);
    }

    @Override
    public void run(String... args) throws Exception {
        Path dir = Path.of(outDir);
        generate(dir.resolve("knowledge-vectors.json"), dir.resolve("knowledge-vectors.meta.json"));
        // One-shot dev tool: exit cleanly so the JVM doesn't linger.
        System.exit(0);
    }
}
