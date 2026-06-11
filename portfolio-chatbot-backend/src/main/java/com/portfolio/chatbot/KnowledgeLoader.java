package com.portfolio.chatbot;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Builds the ordered chunk list for the chatbot knowledge base from bundled
 * markdown ({@code classpath:knowledge/*.md}, {@code classpath:docs/*.md}) plus
 * an optional local filesystem {@code docsPath} (local dev only). Performs NO
 * embedding — output feeds either the build-time generator or the live-ingest
 * fallback.
 *
 * <p>Ordering is deterministic (resources sorted by filename) and chunk ids are
 * content-derived ({@code source#section#index}) so the generated
 * {@code knowledge-vectors.json} produces a minimal diff on regeneration and the
 * freshness hash is stable across machines.
 */
@Component
public class KnowledgeLoader {

    private static final Logger log = LoggerFactory.getLogger(KnowledgeLoader.class);

    private static final Pattern FRONT_MATTER =
            Pattern.compile("^---\\s*\\n(.*?)\\n---\\s*\\n", Pattern.DOTALL);
    private static final Pattern H1_OR_H2 =
            Pattern.compile("(?m)^(#{1,2})\\s+(.+)$");

    private final TokenTextSplitter splitter;
    private final String docsPath;

    public KnowledgeLoader(@Value("${chatbot.docs.path:docs}") String docsPath) {
        this.docsPath = docsPath;
        this.splitter = TokenTextSplitter.builder()
                .withChunkSize(600)
                .withMinChunkSizeChars(100)
                .withMinChunkLengthToEmbed(5)
                .withMaxNumChunks(10000)
                .withKeepSeparator(true)
                .build();
    }

    /** Ordered, deterministic-id chunk list. No embeddings performed. */
    public List<Document> loadChunks() throws IOException {
        List<Document> docs = new ArrayList<>();
        Set<String> seenSources = new HashSet<>();
        addUnique(docs, loadClasspathKnowledge(), seenSources);
        addUnique(docs, loadClasspathDocs(), seenSources);
        addUnique(docs, loadFilesystemDocs(), seenSources);

        if (docs.isEmpty()) {
            log.warn("Chatbot knowledge load produced no documents");
            return List.of();
        }
        return assignDeterministicIds(splitter.apply(docs));
    }

    private static List<Document> assignDeterministicIds(List<Document> chunks) {
        Map<String, Integer> counters = new HashMap<>();
        List<Document> out = new ArrayList<>(chunks.size());
        for (Document c : chunks) {
            String source = str(c.getMetadata().get("source"));
            String section = str(c.getMetadata().get("section"));
            String key = source + "::" + section;
            int idx = counters.merge(key, 1, Integer::sum) - 1;
            String id = source + "#" + section + "#" + idx;
            out.add(new Document(id, c.getText(), c.getMetadata()));
        }
        return out;
    }

    private static void addUnique(List<Document> sink, List<Document> incoming, Set<String> seen) {
        for (Document d : incoming) {
            Object src = d.getMetadata().get("source");
            String key = src == null ? "" : src.toString();
            if (key.isEmpty()
                    || seen.add(key + "#" + d.getMetadata().getOrDefault("section", ""))) {
                sink.add(d);
            }
        }
    }

    // ---------- loaders (sorted by filename for deterministic order) ----------

    private List<Document> loadClasspathKnowledge() throws IOException {
        List<Document> docs = new ArrayList<>();
        for (Resource r : sortedByName("classpath:knowledge/*.md")) {
            String raw = new String(r.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            String filename = r.getFilename() == null ? "unknown.md" : r.getFilename();
            docs.addAll(parseMarkdown(raw, "knowledge/" + filename, defaultMeta(filename)));
        }
        return docs;
    }

    private List<Document> loadClasspathDocs() throws IOException {
        List<Document> docs = new ArrayList<>();
        for (Resource r : sortedByName("classpath:docs/*.md")) {
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
            stream.filter(p -> p.toString().endsWith(".md"))
                    .sorted()
                    .forEach(p -> {
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

    private static Resource[] sortedByName(String pattern) throws IOException {
        Resource[] resources = new PathMatchingResourcePatternResolver().getResources(pattern);
        Resource[] sorted = Arrays.copyOf(resources, resources.length);
        Arrays.sort(sorted, Comparator.comparing(
                r -> r.getFilename() == null ? "" : r.getFilename()));
        return sorted;
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
                    if (!k.isEmpty() && !v.isEmpty()) {
                        meta.put(k, v);
                    }
                }
            }
            body = raw.substring(fm.end());
        }

        List<Document> sections = new ArrayList<>();
        Matcher m = H1_OR_H2.matcher(body);
        List<Integer> headings = new ArrayList<>();
        List<String> titles = new ArrayList<>();
        while (m.find()) {
            headings.add(m.start());
            titles.add(m.group(2).trim());
        }
        if (headings.isEmpty()) {
            sections.add(new Document(body, new HashMap<>(meta)));
            return sections;
        }
        for (int i = 0; i < headings.size(); i++) {
            int start = headings.get(i);
            int end = (i + 1 < headings.size()) ? headings.get(i + 1) : body.length();
            String chunk = body.substring(start, end).trim();
            if (chunk.isEmpty()) {
                continue;
            }
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

    private static String str(Object o) {
        return o == null ? "" : o.toString();
    }
}
