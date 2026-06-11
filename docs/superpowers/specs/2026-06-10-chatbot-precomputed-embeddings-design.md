# Design: Precompute chatbot RAG embeddings at build time

**Date:** 2026-06-10
**Module:** `portfolio-chatbot-backend`
**Status:** Approved (design); pending implementation plan

## 1. Problem

`prod-portfolio-chatbot` deploys fail intermittently on the **Deploy backend Lambdas**
step. The published Lambda version goes to `State=Failed` and the
`aws lambda wait published-version-active` waiter hits a terminal failure
(exit 255), failing the whole `deploy-production` workflow.

### Root cause (evidence)

`KnowledgeIngestionService.ingestAll()` is a `@PostConstruct`
(`KnowledgeIngestionService.java:88`) that builds the in-process
`SimpleVectorStore` (`ChatbotConfig.java:30-33`) by calling the OpenAI
EmbeddingModel **once per chunk, sequentially** for hundreds of KB chunks. This
runs inside the Spring context startup — i.e. during the Lambda **SnapStart Init
phase**, which is hard-capped at ~130 s.

CloudWatch `INIT_REPORT` lines confirm init runs right at that ceiling:

```
# Failed deploy (PR #288, run 27293586819):
INIT_REPORT Init Duration: 129999.72 ms   Phase: init   Status: timeout

# Prior "successful" deploy (PR #287) — only passed on a retry:
INIT_REPORT Init Duration: 130087.22 ms   Phase: init   Status: timeout   ← first attempt FAILED
INIT_REPORT Init Duration:  94553.46 ms                                    ← retry succeeded -> v49
```

The chatbot code in PR #288 is byte-identical to PR #287 (docs-only PR). The
difference between success and failure is purely OpenAI embedding latency at
deploy time. Init duration ranges ~94 s–130 s+, so every deploy is effectively a
coin-flip. The `try/catch` in `ingestAll()` (`:106`) cannot help: a phase
**timeout** kills the process externally before any exception is thrown.

Current prod state at time of writing: alias `current` → v49 (Active), so the
chatbot is up; v50 is an orphaned failed version. No outage.

## 2. Goal

Remove OpenAI from the Lambda **Init path** entirely so that startup is fast and
deterministic (no network, sub-second), eliminating the SnapStart init-timeout
failure mode. Preserve all RAG retrieval behavior and answer quality.

Non-goals: changing retrieval behavior, `RagService`, the controller,
TOP_K/CONTEXT_PASSAGES, the embedding/chat models, or the deploy workflow's AWS
steps.

## 3. Approach (chosen)

The KB content is fully known at build time (bundled markdown; no DB, nothing
dynamic). Embed **once**, persist the vectors to a committed JSON resource, and at
startup **deserialize** it instead of embedding.

Spring AI 1.1.7 `SimpleVectorStore` (verified via `javap` on
`spring-ai-vector-store-1.1.7.jar`) provides:

```
public void save(java.io.File);
public void load(java.io.File);
public void load(org.springframework.core.io.Resource);   // load from classpath at startup
```

Generation strategy (chosen): **commit a generated file + CI freshness gate.**
A developer regenerates the committed vectors when the KB changes; a keyless
unit test fails the build if the committed vectors are stale.

## 4. KB sources (context)

Assembled into the jar at build time:

- `portfolio-backend/src/main/resources/knowledge/*.md` — 7 files, copied via
  the chatbot `pom.xml:165` `<resource>` into `knowledge/` on the classpath.
- repo-level `/docs/*.md` — 10 files, copied into `docs/` on the classpath.

These are split by `TokenTextSplitter` (chunkSize 600, minChunkSizeChars 100,
minChunkLengthToEmbed 5, maxNumChunks 10000, keepSeparator true —
`KnowledgeIngestionService.java:79-85`) into the chunks that get embedded.

Embedding model: `text-embedding-3-small`
(`application.properties:57`, overridable via `OPENAI_EMBEDDING_MODEL`).

## 5. Components

### 5.1 Shared KB loader (refactor)

Extract chunk-building (the markdown loaders + `TokenTextSplitter`) out of
`KnowledgeIngestionService` into a small `KnowledgeLoader` that returns the
ordered `List<Document>` of chunks. The generator, the runtime, and the freshness
test all use this one path so chunking cannot drift between them.

Requirements:
- **Deterministic ordering:** sort sources by classpath filename before
  splitting, so the chunk sequence — and therefore the freshness hash — is stable
  across machines.
- **Deterministic, content-derived document ids:** derive each chunk's id from
  `source + section + chunkIndex` (not random UUID), so regenerating
  `knowledge-vectors.json` produces a minimal diff.

### 5.2 Generator (dev-time, on demand)

A `CommandLineRunner` gated behind a flag (e.g. program arg `--generate-kb`) that:

1. Boots the chatbot Spring context with the real OpenAI `EmbeddingModel`
   (requires `OPENAI_API_KEY`).
2. Builds chunks via `KnowledgeLoader`, computes the KB content hash (§5.4),
   embeds via the existing `SimpleVectorStore` add path.
3. `SimpleVectorStore.save()` → `src/main/resources/knowledge-vectors.json`.
4. Writes sibling `src/main/resources/knowledge-vectors.meta.json`:
   `{ "embeddingModel": "...", "kbContentHash": "...", "chunkCount": N }`.
5. Exits.

A thin wrapper `scripts/generate-chatbot-kb.sh` documents/invokes it. Both
generated files are committed. The runner must be inert during normal app
startup and tests (only activates with the flag).

### 5.3 Runtime load (replaces live embedding in prod)

`KnowledgeIngestionService` (or its successor) on startup:

- If `classpath:knowledge-vectors.json` is present →
  `SimpleVectorStore.load(resource)`. Zero OpenAI calls. Log loaded chunk count.
- If absent → fall back to today's live ingestion (`vectorStore.add(chunks)`).

**Local-dev live fallback is retained** (decision: keep it). In prod the file is
always bundled, so prod init never touches OpenAI. Local dev works with or
without a committed file.

On load, log a warning if the configured embedding model differs from
`knowledge-vectors.meta.json`'s `embeddingModel` (query-time similarity must use
the same model the vectors were built with).

### 5.4 Freshness gate (safety net)

A unit test in the existing **Chatbot Backend Tests** job — **no OpenAI key
required**:

1. Recompute the chunk list from the current bundled KB markdown via
   `KnowledgeLoader`.
2. Compute `kbContentHash` = SHA-256 over the ordered chunk texts (the embedding
   inputs only; the model is checked separately in step 4).
3. Assert it equals `knowledge-vectors.meta.json`'s `kbContentHash`.
4. Assert `meta.embeddingModel` == the configured embedding model.
5. (Sanity) assert the committed store's document count == `meta.chunkCount`.

On mismatch, fail with a clear message: *"Chatbot KB changed — regenerate with
`scripts/generate-chatbot-kb.sh` and commit knowledge-vectors.json /
knowledge-vectors.meta.json."*

This is what makes committing a generated artifact safe: stale embeddings cannot
ship because the build goes red. The hash is over the **embedding inputs** (chunk
texts), so it catches markdown edits, added/removed docs, and splitter-config
changes; the model assertion catches a model swap.

## 6. Data flow

- **Build/CI:** committed `knowledge-vectors.json` is bundled into the jar; no
  embedding occurs. Freshness test guards staleness (keyless).
- **Deploy (`publish-version`):** SnapStart Init deserializes the JSON → fast,
  deterministic, well under the 130 s ceiling.
- **Query (unchanged):** only the user's query is embedded at request time, using
  the same `text-embedding-3-small` model.

## 7. What does NOT change

RAG retrieval, `RagService`, `PortfolioAssistantController`, TOP_K /
CONTEXT_PASSAGES, the embedding/chat model ids, the `deploy-production` workflow
AWS steps, and prod answer quality (same vectors, same model). No OpenAI key is
added to any CI job (the freshness test is keyless; generation is dev-time only).

## 8. Testing

- **Freshness gate test** (§5.4) — keyless, runs in the normal test job.
- **Runtime load test** — given a small fixture `knowledge-vectors.json`, the
  service loads it and the store reports the expected document count, with no
  EmbeddingModel calls (verify via a mock EmbeddingModel that fails if invoked).
- **Fallback test** — with the file absent, the service performs live ingestion
  (existing behavior) — exercised with a mock EmbeddingModel.
- **Loader determinism test** — `KnowledgeLoader` produces a stable chunk order
  and stable ids across repeated runs.
- Existing chatbot test baseline (20) must stay green.

## 9. Risks / edge cases

- **Stale committed vectors:** mitigated by the freshness gate (build fails).
- **Model mismatch at runtime:** logged warning; freshness test asserts the
  stored model matches config so a mismatch can't ship via CI.
- **Generator drift:** generator and runtime/test share `KnowledgeLoader`, so
  chunking is identical by construction.
- **SimpleVectorStore JSON format change across Spring AI upgrades:** the
  freshness/load tests run on every build and would catch an incompatible format
  after a dependency bump.
- **Non-deterministic JSON diffs:** mitigated by deterministic ids + ordering.

## 10. Operational note (out of scope for this change)

The failed deploy (run 27293586819) is partially applied: `prod-portfolio-backend`
shipped v82; `prod-ecommerce-backend`/`prod-ats-backend` had `$LATEST` code
updated but were not re-published (the bash loop aborted under `set -e`), so their
aliases still point to v68/v77. For the docs-only PR #288 this is functionally a
no-op. Re-running the deploy after this fix lands will reconcile all four. (Not
part of this code change.)

## 11. Git

Per the repo's standing rule, no git commands are run automatically. This design
doc is written but not committed; committing is left to the maintainer.
