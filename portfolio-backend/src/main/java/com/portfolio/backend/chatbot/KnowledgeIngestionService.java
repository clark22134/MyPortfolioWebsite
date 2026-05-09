package com.portfolio.backend.chatbot;

import com.portfolio.backend.entity.Project;
import com.portfolio.backend.repository.ProjectRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.scheduling.annotation.Scheduled;
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
 * Loads portfolio knowledge into the in-process vector store on startup
 * and refreshes the live "Project" rows on a schedule so the bot stays in
 * sync with what visitors actually see on the {@code /projects} page.
 *
 * <h2>Sources</h2>
 * <ol>
 *   <li>Curated markdown bundled in {@code src/main/resources/knowledge/}.
 *       Front-matter (between {@code ---} markers) supplies metadata.</li>
 *   <li>Top-level {@code docs/*.md} when running from a checkout
 *       (path overridable via {@code chatbot.docs.path}).</li>
 *   <li>{@link Project} entities from the database, refreshed every
 *       10 minutes.</li>
 * </ol>
 *
 * <h2>Chunking</h2>
 * Markdown is split on H1/H2 headings, then sliced by
 * {@link TokenTextSplitter} into ~600-token chunks with 100-token overlap.
 * Each chunk carries {@code source}, {@code title}, {@code section}, and
 * {@code category} metadata for filtering and citation.
 */
@Service
@ConditionalOnBean(VectorStore.class)
@org.springframework.boot.autoconfigure.condition.ConditionalOnExpression(
        "'${chatbot.enabled:true}' == 'true' and !'${spring.ai.openai.api-key:}'.isEmpty()")
public class KnowledgeIngestionService {

    private static final Logger log = LoggerFactory.getLogger(KnowledgeIngestionService.class);

    private static final Pattern FRONT_MATTER =
            Pattern.compile("^---\\s*\\n(.*?)\\n---\\s*\\n", Pattern.DOTALL);
    private static final Pattern H1_OR_H2 =
            Pattern.compile("(?m)^(#{1,2})\\s+(.+)$");

    private final VectorStore vectorStore;
    private final ProjectRepository projectRepository;
    private final TokenTextSplitter splitter;
    private final String docsPath;

    public KnowledgeIngestionService(
            VectorStore vectorStore,
            ProjectRepository projectRepository,
            @Value("${chatbot.docs.path:docs}") String docsPath) {
        this.vectorStore = vectorStore;
        this.projectRepository = projectRepository;
        this.docsPath = docsPath;
        this.splitter = new TokenTextSplitter(600, 100, 5, 10000, true);
    }

    @PostConstruct
    public void ingestAll() {
        try {
            // Order matters: classpath sources first establish the canonical
            // copy. The filesystem loader skips any source we've already seen
            // so local dev (where /docs is also on disk) doesn't double-ingest
            // the same files that were bundled into the JAR.
            List<Document> docs = new ArrayList<>();
            java.util.Set<String> seenSources = new java.util.HashSet<>();

            addUnique(docs, loadClasspathKnowledge(), seenSources);
            addUnique(docs, loadClasspathDocs(),     seenSources);
            addUnique(docs, loadFilesystemDocs(),    seenSources);
            addUnique(docs, loadProjectsFromDb(),    seenSources);

            if (docs.isEmpty()) {
                log.warn("Chatbot knowledge ingestion produced no documents");
                return;
            }

            List<Document> chunks = splitter.apply(docs);
            vectorStore.add(chunks);
            log.info("Chatbot KB ingested: {} source docs -> {} chunks", docs.size(), chunks.size());
        } catch (Exception e) {
            // Never fail startup because of the chatbot.
            log.error("Chatbot knowledge ingestion failed: {}", e.getMessage(), e);
        }
    }

    private static void addUnique(List<Document> sink, List<Document> incoming, java.util.Set<String> seen) {
        for (Document d : incoming) {
            Object src = d.getMetadata().get("source");
            String key = src == null ? "" : src.toString();
            // Per-source de-dup at the *document* level (sections under one
            // source share the same key, but loaders only emit one source key
            // per file, so collisions only happen across loaders).
            if (key.isEmpty() || seen.add(key + "#" + d.getMetadata().getOrDefault("section", ""))) {
                sink.add(d);
            }
        }
    }

    /** Refresh DB-backed project docs every 10 minutes. */
    @Scheduled(fixedDelayString = "${chatbot.refresh.ms:600000}", initialDelayString = "${chatbot.refresh.ms:600000}")
    public void refreshLiveProjects() {
        try {
            List<Document> projectDocs = loadProjectsFromDb();
            if (projectDocs.isEmpty()) {
                return;
            }
            // SimpleVectorStore is additive; for live data we re-add (cheap & idempotent enough
            // for the size of this corpus). For larger corpora a dedicated store with deletes
            // by metadata filter would be used.
            vectorStore.add(splitter.apply(projectDocs));
            log.debug("Refreshed {} live project documents", projectDocs.size());
        } catch (Exception e) {
            log.warn("Live project refresh failed: {}", e.getMessage());
        }
    }

    // ---------- loaders ----------

    private List<Document> loadClasspathKnowledge() throws IOException {
        Resource[] resources = new PathMatchingResourcePatternResolver()
                .getResources("classpath:knowledge/*.md");
        List<Document> docs = new ArrayList<>();
        for (Resource r : resources) {
            String raw = new String(r.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            docs.addAll(parseMarkdown(raw, "knowledge/" + r.getFilename(), defaultMeta(r.getFilename())));
        }
        return docs;
    }

    /**
     * Loads /docs/*.md from the classpath. The pom bundles the repo-level
     * /docs directory under BOOT-INF/classes/docs/ so the bot has full
     * portfolio documentation available in production (Lambda) where the
     * source tree is not on disk.
     */
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

    private List<Document> loadProjectsFromDb() {
        List<Document> out = new ArrayList<>();
        try {
            for (Project p : projectRepository.findAll()) {
                StringBuilder sb = new StringBuilder();
                sb.append("# ").append(safe(p.getTitle())).append("\n\n");
                if (p.getDescription() != null) {
                    sb.append(p.getDescription()).append("\n\n");
                }
                if (p.getTechnologies() != null && !p.getTechnologies().isEmpty()) {
                    sb.append("Technologies: ").append(String.join(", ", p.getTechnologies())).append(".\n");
                }
                if (p.getStartDate() != null) {
                    sb.append("Duration: ").append(p.getStartDate());
                    sb.append(" to ").append(p.getEndDate() != null ? p.getEndDate() : "present").append(".\n");
                }
                if (p.getGithubUrl() != null) {
                    sb.append("GitHub: ").append(p.getGithubUrl()).append("\n");
                }
                if (p.getDemoUrl() != null) {
                    sb.append("Demo: ").append(p.getDemoUrl()).append("\n");
                }
                Map<String, Object> meta = new HashMap<>();
                meta.put("category", "live-project");
                meta.put("title", safe(p.getTitle()));
                meta.put("source", "db:project:" + p.getId());
                meta.put("section", safe(p.getTitle()));
                out.add(new Document(sb.toString(), meta));
            }
        } catch (Exception e) {
            log.warn("Could not load projects from DB (likely not initialized yet): {}", e.getMessage());
        }
        return out;
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

        // Split on H1/H2 to keep section context tight; each section becomes its own
        // Document and is then sub-split by the TokenTextSplitter.
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
        return m;
    }

    private static String safe(String s) {
        return s == null ? "" : s;
    }
}
