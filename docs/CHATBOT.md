# Portfolio Assistant (RAG Chatbot)

A production-ready, retrieval-augmented chatbot embedded in the **portfolio**
site. It answers questions about Clark Foster's projects, skills, AI work,
accessibility approach, credentials, and documentation.

> Scope: this feature lives entirely inside the portfolio app
> (`portfolio-backend`, `portfolio-frontend`). The ATS and e-commerce apps
> are intentionally untouched.

## Architecture

```
Browser (Angular 21)
  ▼  POST /api/chatbot/stream  (JSON body, SSE response)
Spring Boot 3.5 (portfolio-backend)
  ├─ PortfolioAssistantController   ← per-IP rate limit, CSRF-exempt, public
  ├─ RagService                     ← retrieval, prompt assembly, streaming
  ├─ KnowledgeIngestionService      ← startup ingest + scheduled refresh
  ├─ ChatbotConfig                  ← VectorStore / ChatMemory / ChatClient
  └─ Spring AI 1.0.1
       ├─ OpenAiEmbeddingModel  (text-embedding-3-small, 1536-dim)
       ├─ OpenAiChatModel       (gpt-4o-mini, T=0.2)
       └─ SimpleVectorStore     (in-process, file-backed JSON)
```

## Why SimpleVectorStore (not ChromaDB)?

The user asked us to justify deviations from ChromaDB.

| Criterion | SimpleVectorStore | ChromaDB |
| --- | --- | --- |
| Corpus size | Hundreds of chunks (entire portfolio) | Designed for millions |
| Ops surface | None — runs in-process | Separate service to host, monitor, secure |
| Latency | Memory-resident; sub-ms search | Network hop |
| AWS Lambda story | Single fat JAR, no extra container | Needs an additional service or managed Chroma |
| Cost | $0 | Adds infra |
| Code shape | Identical — both implement Spring AI's `VectorStore` interface |

For a portfolio knowledge base the corpus will not exceed a few thousand
chunks even with aggressive growth. SimpleVectorStore gives equivalent
quality with zero operational overhead. Because everything is hidden behind
the `VectorStore` interface, swapping to Chroma, Pinecone, pgvector, or
Azure AI Search later is a one-bean change in `ChatbotConfig`.

## Data flow (per query)

1. **Health gate** — `available()` is `false` if `OPENAI_API_KEY` is unset
   or `chatbot.enabled=false`. Frontend hides input and shows a banner.
2. **Rate limit** — sliding 60-second per-IP window
   (`chatbot.rate-limit.per-minute`, default 20).
3. **Query expansion** — known acronyms (ATS, RAG, IaC, CI/CD, WCAG, CFI,
   USMC) are appended in parentheses to improve retrieval recall.
4. **Retrieval** — top-K (default 8) similar chunks via cosine similarity
   on OpenAI embeddings, then category-aware reranking, then top
   `CONTEXT_PASSAGES` (default 4) are passed to the LLM.
5. **Prompt** — strict system prompt that forbids invention and demands
   inline `[1]`-style citations whose numbers index into the structured
   `citations` array.
6. **Streaming** — `SseEmitter` pushes:
   - `event: token`     — incremental answer fragments
   - `event: citations` — JSON array sent once after the final token
   - `event: done`      — stream complete
   - `event: error`     — recoverable failure

7. **Memory** — `MessageWindowChatMemory` (max 20 messages) keyed by
   `conversationId` from the client (rotated when the user clicks "New
   conversation").

## Knowledge base

Sources, ingested at startup and merged in this order:

1. **Curated markdown** — `portfolio-backend/src/main/resources/knowledge/*.md`
   (`about`, `projects`, `ai-projects`, `skills`, `credentials`,
   `accessibility`, `contact`).
2. **Repo documentation** — every `*.md` under `chatbot.docs.path`
   (defaults to `../docs`).
3. **Live project records** — `ProjectRepository` rows, refreshed every
   `chatbot.refresh.ms` (default 10 minutes) via `@Scheduled`.

Each document carries YAML front-matter:

```markdown
---
title: AI Projects
category: ai
source: ai-projects
---
```

…and is split into chunks by `(#|##)` headings, then by
`TokenTextSplitter(600, 100)` for embedding.

### Adding new content

Drop a markdown file in `portfolio-backend/src/main/resources/knowledge/`
(or anywhere under `docs/`) with the YAML front-matter above. Restart the
backend (or wait for the next `@Scheduled` refresh) — it is automatically
picked up.

## Configuration

| Property | Env var | Default | Purpose |
| --- | --- | --- | --- |
| `spring.ai.openai.api-key` | `OPENAI_API_KEY` | empty | Required to enable the chatbot |
| `chatbot.enabled` | `CHATBOT_ENABLED` | `true` | Master kill switch |
| `chatbot.rate-limit.per-minute` | `CHATBOT_RATE_LIMIT_PER_MIN` | `20` | Per-IP throttle |
| `chatbot.docs.path` | `CHATBOT_DOCS_PATH` | `../docs` | Filesystem docs to ingest |
| `chatbot.refresh.ms` | `CHATBOT_REFRESH_MS` | `600000` | Live-data refresh interval |

If `OPENAI_API_KEY` is absent, **the application starts normally** — the
`@ConditionalOnExpression` on `ChatbotConfig` skips bean creation and
`/api/chatbot/health` reports `{ "available": false }`. The frontend
gracefully degrades.

## Security

- Endpoints are public **and** CSRF-exempt
  (see `SecurityConfig.PUBLIC_ENDPOINTS` / `CSRF_IGNORED_ENDPOINTS`).
- Per-IP rate limiting (sliding window).
- Input validation: `@NotBlank @Size(max=1000)` on the message.
- `conversationId` capped at 64 chars.
- The OpenAI API key is read from environment variables only — never
  committed.
- Markdown rendered in the UI uses `marked` defaults, which do not
  permit raw `<script>` tags.

## Frontend

- `ChatbotService` (`portfolio-frontend/src/app/services/chatbot.service.ts`)
  owns the conversation state via Angular signals.
- `ChatbotLauncherComponent`
  (`portfolio-frontend/src/app/components/chatbot-launcher/`) is mounted
  globally in `AppComponent` and provides an accessible floating launcher.
- Accessibility:
  - `role="dialog" aria-modal="true"` panel.
  - `aria-live="polite"` message log so SR users hear streamed tokens.
  - Esc closes / restores focus to the launcher.
  - Enter sends, Shift+Enter inserts a newline.
  - Honors `prefers-reduced-motion` and `prefers-contrast: more`.
  - Status indicator (green dot / red dot) for backend health.

## Performance & cost notes

- `text-embedding-3-small` is ~1/5 the cost of `text-embedding-3-large`
  with sufficient quality for a portfolio corpus.
- `gpt-4o-mini` at `T=0.2` keeps responses grounded and inexpensive.
- Streaming responses keep p95 perceived latency low even on a cold cache.
- All heavy startup work (ingestion, embedding) is one-shot at boot.

## Testing locally

```bash
export OPENAI_API_KEY=sk-...
cd portfolio-backend
mvn -DskipTests spring-boot:run
# in another terminal
cd portfolio-frontend
npm start
# open http://localhost:4200 — the assistant button is bottom-right
```

## Future swaps

- **Vector store** — replace the `portfolioVectorStore` bean with
  `PgVectorStore`, `ChromaVectorStore`, or `PineconeVectorStore`.
- **LLM provider** — swap the `spring-ai-starter-model-openai` starter
  for another provider; nothing else changes.
- **Rerankers** — slot a `DocumentPostProcessor` in `RagService` to add
  cross-encoder reranking once corpus size warrants it.
