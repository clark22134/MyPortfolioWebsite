package com.portfolio.chatbot;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Loads portfolio knowledge into the in-process vector store on startup.
 *
 * <h2>Sources (in order)</h2>
 * <ol>
 *   <li>Curated markdown bundled in {@code src/main/resources/knowledge/}
 *       (sourced from portfolio-backend at build time). Front-matter
 *       between {@code ---} markers supplies metadata.</li>
 *   <li>{@code docs/*.md} bundled from the repo-level {@code /docs}
 *       directory.</li>
 *   <li>Filesystem {@code chatbot.docs.path} (local dev only) — the
 *       de-dup logic skips files already loaded above.</li>
 * </ol>
 *
 * <p>Live project data (originally pulled from the portfolio Aurora cluster)
 * has been intentionally dropped. The bundled docs already describe every
 * project; live refresh would require either VPC access or an extra HTTPS
 * round-trip to the portfolio API on every cold start. Updates to project
 * descriptions ship with the next deployment.</p>
 *
 * <h2>Failure modes</h2>
 * Any failure in {@link #ingestAll()} (e.g. network blip on the very first
 * embedding call) is logged at ERROR and swallowed. The Lambda still serves
 * /api/chatbot/health, just returning empty results until the next cold
 * start.
 */
@Service
@ConditionalOnBean(VectorStore.class)
@ConditionalOnExpression(
        "'${chatbot.enabled:true}' == 'true' and !'${spring.ai.openai.api-key:}'.isEmpty()")
public class KnowledgeIngestionService {

    private static final Logger log = LoggerFactory.getLogger(KnowledgeIngestionService.class);

    private static final Pattern FRONT_MATTER =
            Pattern.compile("^---\\s*\\n(.*?)\\n---\\s*\\n", Pattern.DOTALL);
    private static final Pattern H1_OR_H2 =
            Pattern.compile("(?m)^(#{1,2})\\s+(.+)$");

    private final VectorStore vectorStore;
    private final TokenTextSplitter splitter;
    private final String docsPath;

    public KnowledgeIngestionService(
            VectorStore vectorStore,
            @Value("${chatbot.docs.path:docs}") String docsPath) {
        this.vectorStore = vectorStore;
        this.docsPath = docsPath;
        // Spring AI 1.1 replaced the 5-arg constructor with a 6-arg one (adding
        // punctuationMarks); the builder sets the same params with default
        // punctuation, preserving the prior chunking behavior.
        this.splitter = TokenTextSplitter.builder()
                .withChunkSize(600)
                .withMinChunkSizeChars(100)
                .withMinChunkLengthToEmbed(5)
                .withMaxNumChunks(10000)
                .withKeepSeparator(true)
                .build();
    }

    @PostConstruct
    public void ingestAll() {
        try {
            List<Document> docs = new ArrayList<>();
            java.util.Set<String> seenSources = new java.util.HashSet<>();

            addUnique(docs, loadClasspathKnowledge(), seenSources);
            addUnique(docs, loadClasspathDocs(),     seenSources);
            addUnique(docs, loadFilesystemDocs(),    seenSources);

            if (docs.isEmpty()) {
                log.warn("Chatbot knowledge ingestion produced no documents");
                return;
            }

            List<Document> chunks = splitter.apply(docs);
            vectorStore.add(chunks);
            log.info("Chatbot KB ingested: {} source docs -> {} chunks", docs.size(), chunks.size());
        } catch (Exception e) {
            log.error("Chatbot knowledge ingestion failed: {}", e.getMessage(), e);
        }
    }

    private static void addUnique(List<Document> sink, List<Document> incoming, java.util.Set<String> seen) {
        for (Document d : incoming) {
            Object src = d.getMetadata().get("source");
            String key = src == null ? "" : src.toString();
            if (key.isEmpty() || seen.add(key + "#" + d.getMetadata().getOrDefault("section", ""))) {
                sink.add(d);
            }
        }
    }

    // ---------- loaders ----------

    private List<Document> loadClasspathKnowledge() throws IOException {
        Resource[] resources = new PathMatchingResourcePatternResolver()
                .getResources("classpath:knowledge/*.md");
        List<Document> docs = new ArrayList<>();
        for (Resource r : resources) {
            String raw = new String(r.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            String filename = r.getFilename() == null ? "unknown.md" : r.getFilename();
            docs.addAll(parseMarkdown(raw, "knowledge/" + filename, defaultMeta(filename)));
        }
        return docs;
    }

    private List<Document> loadClasspathDocs() throws IOException {
        Resource[] resources = new PathMatchingResourcePatternResolver()
                .getResources("classpath:docs/*.md");
        List<Document> docs = new ArrayList<>();
        for (Resource r : resources) {
            String raw = new String(r.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            String filename = r.getFilename() == null ? "unknown.md" : r.getFilename();
            Map<String, Object> meta = new HashMap<>();
            meta.put("category", "documentation");
            meta.put("title", filename.replace(".md", ""));
            docs.addAll(parseMarkdown(raw, "docs/" + filename, meta));
        }
        return docs;
    }

    private List<Document> loadFilesystemDocs() {
        List<Document> docs = new ArrayList<>();
        Path dir = Paths.get(docsPath);
        if (!Files.isDirectory(dir)) {
            return docs;
        }
        try (var stream = Files.list(dir)) {
            stream.filter(p -> p.toString().endsWith(".md")).forEach(p -> {
                try {
                    String raw = Files.readString(p, StandardCharsets.UTF_8);
                    Map<String, Object> meta = new HashMap<>();
                    meta.put("category", "documentation");
                    meta.put("title", p.getFileName().toString().replace(".md", ""));
                    docs.addAll(parseMarkdown(raw, "docs/" + p.getFileName(), meta));
                } catch (IOException e) {
                    log.warn("Failed to read {}: {}", p, e.getMessage());
                }
            });
        } catch (IOException e) {
            log.warn("Failed to list {}: {}", dir, e.getMessage());
        }
        return docs;
    }

    // ---------- parsing ----------

    private List<Document> parseMarkdown(String raw, String source, Map<String, Object> baseMeta) {
        Map<String, Object> meta = new HashMap<>(baseMeta);
        meta.put("source", source);

        Matcher fm = FRONT_MATTER.matcher(raw);
        String body = raw;
        if (fm.find()) {
            for (String line : fm.group(1).split("\\r?\\n")) {
                int colon = line.indexOf(':');
                if (colon > 0) {
                    String k = line.substring(0, colon).trim();
                    String v = line.substring(colon + 1).trim();
                    if (!k.isEmpty() && !v.isEmpty()) meta.put(k, v);
                }
            }
            body = raw.substring(fm.end());
        }

        List<Document> sections = new ArrayList<>();
        Matcher m = H1_OR_H2.matcher(body);
        List<int[]> headings = new ArrayList<>();
        List<String> titles = new ArrayList<>();
        while (m.find()) {
            headings.add(new int[]{m.start()});
            titles.add(m.group(2).trim());
        }
        if (headings.isEmpty()) {
            sections.add(new Document(body, new HashMap<>(meta)));
            return sections;
        }
        for (int i = 0; i < headings.size(); i++) {
            int start = headings.get(i)[0];
            int end = (i + 1 < headings.size()) ? headings.get(i + 1)[0] : body.length();
            String chunk = body.substring(start, end).trim();
            if (chunk.isEmpty()) continue;
            Map<String, Object> sectionMeta = new HashMap<>(meta);
            sectionMeta.put("section", titles.get(i));
            sections.add(new Document(chunk, sectionMeta));
        }
        return sections;
    }

    private static Map<String, Object> defaultMeta(String filename) {
        Map<String, Object> m = new HashMap<>();
        m.put("category", filename != null ? filename.replace(".md", "") : "knowledge");
        m.put("title", filename != null ? filename.replace(".md", "") : "knowledge");
        return m;
    }
}
