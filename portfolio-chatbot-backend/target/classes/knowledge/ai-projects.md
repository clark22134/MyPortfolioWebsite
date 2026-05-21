---
title: AI Projects
category: ai-projects
source: ai-projects-page
---

# AI / ML Projects

A focused collection of applied AI work that complements the full-stack
projects on this site.

## 1. Portfolio RAG Chatbot (this site's assistant) — **Live**

The floating chatbot in the bottom-right of every page on this portfolio.
Answers questions about Clark's background, projects, technologies, and
documentation by retrieving from a curated knowledge base.

- **Architecture**: Retrieval-Augmented Generation (RAG) deployed as a
  dedicated AWS Lambda (`portfolio-chatbot-backend/`) — separate from the
  main portfolio backend so it can reach api.openai.com directly without VPC
  tunneling.
- **Vector store**: Spring AI `SimpleVectorStore` (in-process). The corpus
  (~7–10k lines of markdown → a few hundred chunks) is well under the
  threshold where a dedicated server adds value. Swappable to Chroma /
  PGVector behind the `VectorStore` interface.
- **Embeddings**: OpenAI `text-embedding-3-small` (1536-dim).
- **LLM**: OpenAI `gpt-5.5-instant` for accurate, instruction-following responses.
- **Retrieval pipeline**: query expansion → semantic top-k=12 →
  cosine-similarity rerank + dedupe → top-6 context passages →
  synchronous SSE response with citations.
- **Source**: `portfolio-chatbot-backend/src/main/java/com/portfolio/chatbot/`.

## 2. Multimodal Search Engine — **In Development**

Search across images and text using CLIP embeddings — query with text to find
images, or query with an image to find related text.

- **Models**: OpenAI CLIP (ViT-B/32) for joint image-text embeddings.
- **Index**: FAISS for sub-millisecond approximate nearest-neighbor search.
- **Pipeline**: image preprocessing → embedding → FAISS index → re-ranking by
  cosine similarity.

## 3. ML Pipeline with MLOps — **In Development**

End-to-end machine learning pipeline: feature engineering, training, model
versioning with **MLflow**, and automated deployment.

- **Data formats**: CSV, JSON, Parquet, XLSX up to 50 MB.
- **Tracking**: MLflow experiments, parameters, metrics, artifacts.
- **Deployment**: model registry → containerized inference service.

## 4. Fine-Tuned LLM — **Planned**

Custom domain-specific language models fine-tuned with **LoRA / QLoRA** on
HuggingFace transformers.

- **Approach**: Parameter-efficient fine-tuning to keep training affordable on
  consumer GPUs.
- **Inputs**: JSONL / JSON / CSV / TXT training data up to 25 MB.
- **Use cases**: domain Q&A, structured extraction, customer-support bots.

## Cross-cutting AI practices

- Prompt versioning and evaluation harness for each model.
- Cost guardrails: per-request token caps and provider-side rate limits.
- Safety: content filtering, citation of sources where possible, no PII in
  prompts.
- Observability: request, token, and latency metrics surfaced via Spring Boot
  Actuator and shipped to the standard log pipeline.
