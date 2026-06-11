# Chatbot Precomputed Embeddings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove OpenAI calls from the chatbot Lambda's SnapStart Init phase by precomputing the RAG embeddings at build time, committing them as a JSON resource, and deserializing them at startup — eliminating the ~130 s init-timeout deploy failures.

**Architecture:** Extract KB chunk-building into a shared `KnowledgeLoader`. A dev-time, profile-gated `KnowledgeVectorGenerator` embeds the chunks once and writes a committed `knowledge-vectors.json` + `knowledge-vectors.meta.json`. At startup `KnowledgeIngestionService` calls `SimpleVectorStore.load()` on the committed file (zero OpenAI calls) and only falls back to live embedding when the file is absent (local dev). A keyless `KnowledgeVectorsFreshnessTest` fails the build if the committed vectors drift from the current KB markdown.

**Tech Stack:** Java 21, Spring Boot 3.5.14, Spring AI 1.1.7 (`SimpleVectorStore`, `TokenTextSplitter`, `EmbeddingModel`), Maven (maven-shade-plugin), JUnit 5 + spring-boot-starter-test (AssertJ).

---

## Repo conventions & commands

- Module dir: `portfolio-chatbot-backend/`. All paths below are repo-relative.
- Build/test (per CLAUDE.md): `export JAVA_HOME=/opt/homebrew/Cellar/openjdk/26.0.1/libexec/openjdk.jdk/Contents/Home` then `mvn -f portfolio-chatbot-backend/pom.xml test`. Tests need **no network** (they use a fake `EmbeddingModel`); the generator (Task 6) **does** need network + an OpenAI key.
- Existing chatbot test baseline is **20** tests; all must stay green.
- **Git rule (repo standing rule): never run git commands unless the user explicitly authorizes it.** Each task ends with a commit *step*, but DO NOT run it unprompted — leave commits to the maintainer. The step documents the intended commit only.

## File structure

**Create (main):**
- `portfolio-chatbot-backend/src/main/java/com/portfolio/chatbot/KnowledgeLoader.java` — builds the ordered, deterministic-id chunk list from bundled KB markdown. No embeddings.
- `portfolio-chatbot-backend/src/main/java/com/portfolio/chatbot/KnowledgeHasher.java` — SHA-256 over ordered chunk texts.
- `portfolio-chatbot-backend/src/main/java/com/portfolio/chatbot/KnowledgeVectorsMeta.java` — record `{embeddingModel, kbContentHash, chunkCount}`.
- `portfolio-chatbot-backend/src/main/java/com/portfolio/chatbot/KnowledgeVectorGenerator.java` — `@Profile("generate-kb")` CommandLineRunner; embeds + saves the artifact.

**Modify (main):**
- `portfolio-chatbot-backend/src/main/java/com/portfolio/chatbot/ChatbotConfig.java` — bean return type `VectorStore` → `SimpleVectorStore`.
- `portfolio-chatbot-backend/src/main/java/com/portfolio/chatbot/KnowledgeIngestionService.java` — load precomputed vectors if present; else live-ingest via `KnowledgeLoader`.

**Create (test):**
- `.../src/test/java/com/portfolio/chatbot/support/FakeEmbeddingModel.java` — controllable fake `EmbeddingModel`.
- `.../src/test/java/com/portfolio/chatbot/KnowledgeLoaderTest.java`
- `.../src/test/java/com/portfolio/chatbot/KnowledgeHasherTest.java`
- `.../src/test/java/com/portfolio/chatbot/KnowledgeVectorGeneratorTest.java`
- `.../src/test/java/com/portfolio/chatbot/KnowledgeIngestionServiceTest.java`
- `.../src/test/java/com/portfolio/chatbot/KnowledgeVectorsFreshnessTest.java`

**Create (script):**
- `scripts/generate-chatbot-kb.sh`

**Generated & committed by Task 6 (via the script, needs OpenAI):**
- `portfolio-chatbot-backend/src/main/resources/knowledge-vectors.json`
- `portfolio-chatbot-backend/src/main/resources/knowledge-vectors.meta.json`

---

## Task 1: Test-support fake EmbeddingModel

A single controllable fake used by Tasks 3–4 so tests run offline.

**Files:**
- Create: `portfolio-chatbot-backend/src/test/java/com/portfolio/chatbot/support/FakeEmbeddingModel.java`

- [ ] **Step 1: Write the fake**

```java
package com.portfolio.chatbot.support;

import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.Embedding;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;

import java.util.ArrayList;
import java.util.List;

/**
 * Offline {@link EmbeddingModel} for tests. Returns a fixed vector for every
 * input and counts calls. If {@code throwOnUse} is true it throws on any
 * embedding attempt — used to prove the load path performs no embedding.
 */
public class FakeEmbeddingModel implements EmbeddingModel {

    private final float[] vector;
    private final boolean throwOnUse;
    private int calls = 0;

    public FakeEmbeddingModel(boolean throwOnUse, float... vector) {
        this.throwOnUse = throwOnUse;
        this.vector = vector.length == 0 ? new float[] {0.1f, 0.2f, 0.3f} : vector;
    }

    public int calls() {
        return calls;
    }

    @Override
    public EmbeddingResponse call(EmbeddingRequest request) {
        calls++;
        if (throwOnUse) {
            throw new IllegalStateException("FakeEmbeddingModel: embedding must not be called on the load path");
        }
        List<Embedding> out = new ArrayList<>();
        List<String> inputs = request.getInstructions();
        for (int i = 0; i < inputs.size(); i++) {
            out.add(new Embedding(vector.clone(), i));
        }
        return new EmbeddingResponse(out);
    }

    @Override
    public float[] embed(Document document) {
        calls++;
        if (throwOnUse) {
            throw new IllegalStateException("FakeEmbeddingModel: embedding must not be called on the load path");
        }
        return vector.clone();
    }

    @Override
    public int dimensions() {
        return vector.length;
    }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `export JAVA_HOME=/opt/homebrew/Cellar/openjdk/26.0.1/libexec/openjdk.jdk/Contents/Home && mvn -f portfolio-chatbot-backend/pom.xml -q test-compile`
Expected: BUILD SUCCESS (no test runs yet).

- [ ] **Step 3: Commit** *(only if git is authorized — see Git rule)*

```bash
git add portfolio-chatbot-backend/src/test/java/com/portfolio/chatbot/support/FakeEmbeddingModel.java
git commit -m "test(chatbot): add offline FakeEmbeddingModel test support"
```

---

## Task 2: KnowledgeHasher

SHA-256 over the ordered chunk texts. Order-sensitive so any KB/chunking change moves the hash.

**Files:**
- Create: `portfolio-chatbot-backend/src/main/java/com/portfolio/chatbot/KnowledgeHasher.java`
- Test: `portfolio-chatbot-backend/src/test/java/com/portfolio/chatbot/KnowledgeHasherTest.java`

- [ ] **Step 1: Write the failing test**

```java
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export JAVA_HOME=/opt/homebrew/Cellar/openjdk/26.0.1/libexec/openjdk.jdk/Contents/Home && mvn -f portfolio-chatbot-backend/pom.xml -q test -Dtest=KnowledgeHasherTest`
Expected: FAIL — `KnowledgeHasher` does not exist (compile error).

- [ ] **Step 3: Write minimal implementation**

```java
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `mvn -f portfolio-chatbot-backend/pom.xml -q test -Dtest=KnowledgeHasherTest`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit** *(only if git is authorized)*

```bash
git add portfolio-chatbot-backend/src/main/java/com/portfolio/chatbot/KnowledgeHasher.java \
        portfolio-chatbot-backend/src/test/java/com/portfolio/chatbot/KnowledgeHasherTest.java
git commit -m "feat(chatbot): add KnowledgeHasher for KB content hashing"
```

---

## Task 3: Extract KnowledgeLoader (refactor)

Move chunk-building out of `KnowledgeIngestionService` into a reusable `KnowledgeLoader` with **deterministic ordering** (sort classpath resources by filename) and **deterministic, content-derived chunk ids** (assigned after splitting). This is the single chunking code path shared by the generator, runtime, and freshness test.

**Files:**
- Create: `portfolio-chatbot-backend/src/main/java/com/portfolio/chatbot/KnowledgeLoader.java`
- Test: `portfolio-chatbot-backend/src/test/java/com/portfolio/chatbot/KnowledgeLoaderTest.java`

- [ ] **Step 1: Write the failing test**

```java
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
        // every chunk carries a source and non-blank text
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `mvn -f portfolio-chatbot-backend/pom.xml -q test -Dtest=KnowledgeLoaderTest`
Expected: FAIL — `KnowledgeLoader` does not exist.

- [ ] **Step 3: Write the implementation** (lift the loaders/parsers from `KnowledgeIngestionService`, add deterministic ordering + ids)

```java
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
import java.util.Objects;
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
```

> Note: the original `parseMarkdown` used `int[]{m.start()}`; this version uses a plain `List<Integer>` for clarity. Behavior (section boundaries) is identical.

- [ ] **Step 4: Run test to verify it passes**

Run: `mvn -f portfolio-chatbot-backend/pom.xml -q test -Dtest=KnowledgeLoaderTest`
Expected: PASS (3 tests). Requires the bundled `knowledge/*.md` + `docs/*.md` on the test classpath (copied by the pom `<resource>` blocks).

- [ ] **Step 5: Commit** *(only if git is authorized)*

```bash
git add portfolio-chatbot-backend/src/main/java/com/portfolio/chatbot/KnowledgeLoader.java \
        portfolio-chatbot-backend/src/test/java/com/portfolio/chatbot/KnowledgeLoaderTest.java
git commit -m "refactor(chatbot): extract KnowledgeLoader with deterministic chunk order/ids"
```

---

## Task 4: KnowledgeVectorsMeta + Generator core

The generator embeds the chunks once (real model in prod usage; fake in tests) and writes `knowledge-vectors.json` + `knowledge-vectors.meta.json`. Core logic is a plain `generate(Path, Path)` method so it is testable offline; the `@Profile("generate-kb")` CommandLineRunner wraps it.

**Files:**
- Create: `portfolio-chatbot-backend/src/main/java/com/portfolio/chatbot/KnowledgeVectorsMeta.java`
- Create: `portfolio-chatbot-backend/src/main/java/com/portfolio/chatbot/KnowledgeVectorGenerator.java`
- Test: `portfolio-chatbot-backend/src/test/java/com/portfolio/chatbot/KnowledgeVectorGeneratorTest.java`

- [ ] **Step 1: Write the meta record**

```java
package com.portfolio.chatbot;

/** Sidecar metadata for the committed precomputed vectors. */
public record KnowledgeVectorsMeta(String embeddingModel, String kbContentHash, int chunkCount) {
}
```

- [ ] **Step 2: Write the failing test**

```java
package com.portfolio.chatbot;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.portfolio.chatbot.support.FakeEmbeddingModel;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SimpleVectorStore;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class KnowledgeVectorGeneratorTest {

    @Test
    void writesVectorsAndMetaMatchingTheKbHash(@TempDir Path tmp) throws Exception {
        FakeEmbeddingModel embedding = new FakeEmbeddingModel(false);
        SimpleVectorStore store = SimpleVectorStore.builder(embedding).build();
        KnowledgeLoader loader = new KnowledgeLoader("docs");

        KnowledgeVectorGenerator generator =
                new KnowledgeVectorGenerator(store, loader, "text-embedding-3-small", tmp.toString());

        Path vectors = tmp.resolve("knowledge-vectors.json");
        Path meta = tmp.resolve("knowledge-vectors.meta.json");
        generator.generate(vectors, meta);

        assertThat(Files.exists(vectors)).isTrue();
        assertThat(Files.exists(meta)).isTrue();
        assertThat(embedding.calls()).isGreaterThan(0); // it actually embedded

        List<Document> chunks = loader.loadChunks();
        KnowledgeVectorsMeta parsed =
                new ObjectMapper().readValue(meta.toFile(), KnowledgeVectorsMeta.class);
        assertThat(parsed.embeddingModel()).isEqualTo("text-embedding-3-small");
        assertThat(parsed.chunkCount()).isEqualTo(chunks.size());
        assertThat(parsed.kbContentHash()).isEqualTo(KnowledgeHasher.contentHash(chunks));
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `mvn -f portfolio-chatbot-backend/pom.xml -q test -Dtest=KnowledgeVectorGeneratorTest`
Expected: FAIL — `KnowledgeVectorGenerator` does not exist.

- [ ] **Step 4: Write the generator**

```java
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `mvn -f portfolio-chatbot-backend/pom.xml -q test -Dtest=KnowledgeVectorGeneratorTest`
Expected: PASS (1 test). Embeds the real bundled KB with the fake model, writes to a temp dir, asserts meta matches the loader hash.

- [ ] **Step 6: Commit** *(only if git is authorized)*

```bash
git add portfolio-chatbot-backend/src/main/java/com/portfolio/chatbot/KnowledgeVectorsMeta.java \
        portfolio-chatbot-backend/src/main/java/com/portfolio/chatbot/KnowledgeVectorGenerator.java \
        portfolio-chatbot-backend/src/test/java/com/portfolio/chatbot/KnowledgeVectorGeneratorTest.java
git commit -m "feat(chatbot): add precomputed-vector generator (profile-gated)"
```

---

## Task 5: Runtime load (ChatbotConfig + KnowledgeIngestionService)

Switch startup to `SimpleVectorStore.load()` of the committed file; keep live ingestion only as the file-absent fallback (local dev). Warn if the committed model differs from the configured one.

**Files:**
- Modify: `portfolio-chatbot-backend/src/main/java/com/portfolio/chatbot/ChatbotConfig.java:30-33`
- Modify: `portfolio-chatbot-backend/src/main/java/com/portfolio/chatbot/KnowledgeIngestionService.java` (full rewrite of the class body — loaders now live in `KnowledgeLoader`)
- Test: `portfolio-chatbot-backend/src/test/java/com/portfolio/chatbot/KnowledgeIngestionServiceTest.java`

- [ ] **Step 1: Change the VectorStore bean type so it can be loaded**

In `ChatbotConfig.java`, change the bean return type from `VectorStore` to `SimpleVectorStore` (the builder already returns one). Add the import `org.springframework.ai.vectorstore.SimpleVectorStore` (already present) and keep `VectorStore` import (still used in the class doc/`@Bean` signatures elsewhere if any — remove if unused to avoid an unused-import warning):

```java
    @Bean
    public SimpleVectorStore portfolioVectorStore(EmbeddingModel embeddingModel) {
        return SimpleVectorStore.builder(embeddingModel).build();
    }
```

`RagService` injects `VectorStore` (interface) and is still satisfied by this bean.

- [ ] **Step 2: Write the failing tests**

```java
package com.portfolio.chatbot;

import com.portfolio.chatbot.support.FakeEmbeddingModel;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.SimpleVectorStore;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class KnowledgeIngestionServiceTest {

    /** Build a saved vectors file from two known docs using a fake model. */
    private Path writeFixture(Path tmp, FakeEmbeddingModel embedding) {
        SimpleVectorStore gen = SimpleVectorStore.builder(embedding).build();
        gen.add(List.of(
                new Document("id-1", "Clark built the ATS project.", Map.of("source", "knowledge/projects.md")),
                new Document("id-2", "Clark is a software engineer.", Map.of("source", "knowledge/about.md"))));
        Path file = tmp.resolve("knowledge-vectors.json");
        gen.save(file.toFile());
        return file;
    }

    @Test
    void loadPathPerformsNoEmbedding(@TempDir Path tmp) {
        Path fixture = writeFixture(tmp, new FakeEmbeddingModel(false));

        FakeEmbeddingModel throwing = new FakeEmbeddingModel(true);
        SimpleVectorStore target = SimpleVectorStore.builder(throwing).build();
        Resource res = new FileSystemResource(fixture.toFile());

        KnowledgeIngestionService service =
                new KnowledgeIngestionService(target, new KnowledgeLoader("docs"), res, "text-embedding-3-small");

        assertThatCode(service::ingestAll).doesNotThrowAnyException();
        assertThat(throwing.calls()).isZero(); // load() must not embed
    }

    @Test
    void loadPathPopulatesStore(@TempDir Path tmp) {
        FakeEmbeddingModel embedding = new FakeEmbeddingModel(false);
        Path fixture = writeFixture(tmp, embedding);

        SimpleVectorStore target = SimpleVectorStore.builder(embedding).build();
        Resource res = new FileSystemResource(fixture.toFile());

        KnowledgeIngestionService service =
                new KnowledgeIngestionService(target, new KnowledgeLoader("docs"), res, "text-embedding-3-small");
        service.ingestAll();

        List<Document> hits = target.similaritySearch(SearchRequest.builder().query("ATS").topK(2).build());
        assertThat(hits).hasSize(2);
    }

    @Test
    void fallsBackToLiveIngestionWhenFileAbsent(@TempDir Path tmp) {
        FakeEmbeddingModel embedding = new FakeEmbeddingModel(false);
        SimpleVectorStore target = SimpleVectorStore.builder(embedding).build();
        Resource missing = new FileSystemResource(tmp.resolve("does-not-exist.json").toFile());

        KnowledgeIngestionService service =
                new KnowledgeIngestionService(target, new KnowledgeLoader("docs"), missing, "text-embedding-3-small");
        service.ingestAll();

        // live ingestion embedded the real bundled KB
        assertThat(embedding.calls()).isGreaterThan(0);
        List<Document> hits = target.similaritySearch(SearchRequest.builder().query("Clark").topK(1).build());
        assertThat(hits).isNotEmpty();
    }
}
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `mvn -f portfolio-chatbot-backend/pom.xml -q test -Dtest=KnowledgeIngestionServiceTest`
Expected: FAIL — `KnowledgeIngestionService` does not yet have the `(SimpleVectorStore, KnowledgeLoader, Resource, String)` constructor.

- [ ] **Step 4: Rewrite `KnowledgeIngestionService`**

Replace the entire class with the load-first version (loaders now live in `KnowledgeLoader`):

```java
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
```

- [ ] **Step 5: Run the new tests + full module suite**

Run: `mvn -f portfolio-chatbot-backend/pom.xml -q test -Dtest=KnowledgeIngestionServiceTest` then `mvn -f portfolio-chatbot-backend/pom.xml -q test`
Expected: new tests PASS (3); full suite green (baseline 20 + new tests). Note: the freshness test (Task 6) is not added yet.

- [ ] **Step 6: Commit** *(only if git is authorized)*

```bash
git add portfolio-chatbot-backend/src/main/java/com/portfolio/chatbot/ChatbotConfig.java \
        portfolio-chatbot-backend/src/main/java/com/portfolio/chatbot/KnowledgeIngestionService.java \
        portfolio-chatbot-backend/src/test/java/com/portfolio/chatbot/KnowledgeIngestionServiceTest.java
git commit -m "feat(chatbot): load precomputed vectors at startup; live ingest only as dev fallback"
```

---

## Task 6: Generation script + generate & commit the artifact (NETWORK + OpenAI key — maintainer runs this)

This produces the committed artifact. **Requires network and an OpenAI key**, so it is run by the maintainer locally (the Claude Code sandbox cannot reach the network — run with the sandbox disabled). Until the artifact exists and matches, Task 7's freshness test fails by design.

**Files:**
- Create: `scripts/generate-chatbot-kb.sh`
- Generated: `portfolio-chatbot-backend/src/main/resources/knowledge-vectors.json`, `.../knowledge-vectors.meta.json`

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
set -euo pipefail

# Regenerate the chatbot's precomputed RAG embeddings.
#
# Run this whenever the KB markdown changes
# (portfolio-backend/src/main/resources/knowledge/*.md or repo /docs/*.md).
# Requires network + an OpenAI key. Provide the key one of two ways:
#   export OPENAI_API_KEY=sk-...
# or (uses Secrets Manager, needs AWS creds with GetSecretValue):
#   export OPENAI_SECRET_ARN=arn:aws:secretsmanager:...:secret:...
#
# Do NOT set CHATBOT_DOCS_PATH — the committed artifact must match what CI sees
# (classpath knowledge/ + docs/ only), and a local docs path would add extra
# chunks and break the freshness gate.

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOD="$HERE/portfolio-chatbot-backend"
RES="$MOD/src/main/resources"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/Cellar/openjdk/26.0.1/libexec/openjdk.jdk/Contents/Home}"

if [[ -z "${OPENAI_API_KEY:-}" && -z "${OPENAI_SECRET_ARN:-}" ]]; then
  echo "ERROR: set OPENAI_API_KEY or OPENAI_SECRET_ARN before running." >&2
  exit 1
fi

# Compile first so bundled knowledge/*.md + docs/*.md land on the runtime classpath,
# then run the generator profile (web server disabled; one-shot, exits when done).
mvn -q -f "$MOD/pom.xml" compile
mvn -q -f "$MOD/pom.xml" \
  org.springframework.boot:spring-boot-maven-plugin:3.5.14:run \
  -Dspring-boot.run.profiles=generate-kb \
  -Dspring-boot.run.arguments="--spring.main.web-application-type=none --chatbot.kb.generate.out=$RES"

echo "Generated:"
echo "  $RES/knowledge-vectors.json"
echo "  $RES/knowledge-vectors.meta.json"
```

- [ ] **Step 2: Make it executable**

Run: `chmod +x scripts/generate-chatbot-kb.sh`

- [ ] **Step 3: Generate the artifact (maintainer, sandbox disabled, key exported)**

Run: `export OPENAI_API_KEY=sk-...   # or OPENAI_SECRET_ARN=...`
Then: `./scripts/generate-chatbot-kb.sh`
Expected: writes `knowledge-vectors.json` (several MB) and `knowledge-vectors.meta.json`. The run logs `Embedding N chunks with model text-embedding-3-small ...` then `Wrote ...`.

- [ ] **Step 4: Sanity-check the artifact**

Run: `ls -lh portfolio-chatbot-backend/src/main/resources/knowledge-vectors.json && cat portfolio-chatbot-backend/src/main/resources/knowledge-vectors.meta.json`
Expected: a non-empty JSON file; meta shows `embeddingModel": "text-embedding-3-small"`, a `kbContentHash`, and a `chunkCount` > 0.

- [ ] **Step 5: Commit** *(only if git is authorized)*

```bash
git add scripts/generate-chatbot-kb.sh \
        portfolio-chatbot-backend/src/main/resources/knowledge-vectors.json \
        portfolio-chatbot-backend/src/main/resources/knowledge-vectors.meta.json
git commit -m "feat(chatbot): generate + commit precomputed KB vectors"
```

---

## Task 7: Freshness gate test

Fails the build (keyless, in the normal test job) if the committed vectors drift from the current KB or model. This is what makes committing a generated artifact safe.

**Files:**
- Test: `portfolio-chatbot-backend/src/test/java/com/portfolio/chatbot/KnowledgeVectorsFreshnessTest.java`

- [ ] **Step 1: Write the test**

```java
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
```

- [ ] **Step 2: Run it (passes only after Task 6 committed the artifact)**

Run: `mvn -f portfolio-chatbot-backend/pom.xml -q test -Dtest=KnowledgeVectorsFreshnessTest`
Expected: PASS once Task 6's artifact is in place. If it FAILS with the "regenerate" message, re-run `scripts/generate-chatbot-kb.sh` and commit.

- [ ] **Step 3: Commit** *(only if git is authorized)*

```bash
git add portfolio-chatbot-backend/src/test/java/com/portfolio/chatbot/KnowledgeVectorsFreshnessTest.java
git commit -m "test(chatbot): freshness gate for committed precomputed vectors"
```

---

## Task 8: Full verification

- [ ] **Step 1: Run the whole chatbot suite**

Run: `export JAVA_HOME=/opt/homebrew/Cellar/openjdk/26.0.1/libexec/openjdk.jdk/Contents/Home && mvn -f portfolio-chatbot-backend/pom.xml test`
Expected: BUILD SUCCESS. Baseline 20 + new tests (KnowledgeHasherTest 3, KnowledgeLoaderTest 3, KnowledgeVectorGeneratorTest 1, KnowledgeIngestionServiceTest 3, KnowledgeVectorsFreshnessTest 1) all green.

- [ ] **Step 2: Confirm the artifact is bundled into the jar**

Run: `mvn -f portfolio-chatbot-backend/pom.xml -q -DskipTests package && unzip -l portfolio-chatbot-backend/target/portfolio-chatbot-backend-1.0.0.jar | grep knowledge-vectors`
Expected: both `knowledge-vectors.json` and `knowledge-vectors.meta.json` listed at the jar root.

- [ ] **Step 3 (optional local boot sanity, needs OpenAI key):** start the app and hit health.

Run: `export OPENAI_API_KEY=sk-...; mvn -f portfolio-chatbot-backend/pom.xml -q org.springframework.boot:spring-boot-maven-plugin:3.5.14:run &` then `curl -s localhost:8081/api/chatbot/health`
Expected: logs show `Chatbot KB loaded from precomputed vectors (knowledge-vectors.json)` — NOT hundreds of "Calling EmbeddingModel" lines. `{"available":true,...}`. Stop the app afterward.

- [ ] **Step 4: Deploy reconciliation note (post-merge, maintainer)**

After this lands on `main` and deploys, the chatbot publishes a new version that loads vectors at init (sub-second) — no timeout. The prior failed run (27293586819) left `prod-ecommerce-backend`/`prod-ats-backend` `$LATEST` updated but un-published; this deploy re-publishes all four and shifts aliases. Verify the chatbot `published-version-active` waiter passes and CloudWatch shows the "loaded from precomputed vectors" line.

---

## Self-Review

**Spec coverage:**
- §3 precompute + commit + freshness gate → Tasks 4, 6, 7. ✅
- §5.1 shared `KnowledgeLoader`, deterministic order + ids → Task 3. ✅
- §5.2 generator + script → Tasks 4, 6. ✅
- §5.3 runtime load + local-dev fallback + model-mismatch warning → Task 5 (`warnIfModelMismatch`). ✅
- §5.4 keyless freshness gate (hash + model + chunkCount) → Task 7. ✅
- §6 data flow (bundled, no embed at build/deploy; query unchanged) → Tasks 5, 8 Step 2. ✅
- §8 testing (freshness, runtime load, fallback, loader determinism) → Tasks 2,3,5,7. ✅
- §9 risks (stale→gate, model mismatch→gate+warn, generator drift→shared loader, deterministic diffs→Task 3 ids). ✅

**Placeholder scan:** No TBD/TODO; every code step has full code; commands have expected output. ✅

**Type consistency:** `KnowledgeVectorsMeta(String embeddingModel, String kbContentHash, int chunkCount)` used identically in Tasks 4/5/7. `KnowledgeLoader.loadChunks()` and `KnowledgeHasher.contentHash(List<Document>)` signatures consistent across tasks. `KnowledgeIngestionService(SimpleVectorStore, KnowledgeLoader, Resource, String)` constructor matches its test in Task 5. `FakeEmbeddingModel(boolean throwOnUse, float... vector)` + `calls()` consistent in Tasks 1/4/5. Bean type `SimpleVectorStore portfolioVectorStore(...)` consumed as `SimpleVectorStore` (ingestion/generator) and `VectorStore` (RagService). ✅

**Known sequencing constraint:** Task 7's test cannot pass until Task 6 (network, maintainer-run) commits the artifact. Tasks 1–5 are fully offline/TDD. This is intentional and called out in Tasks 6–7.
