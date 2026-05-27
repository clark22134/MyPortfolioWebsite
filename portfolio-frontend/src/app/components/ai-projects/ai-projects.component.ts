import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface AiProject {
  id: string;
  title: string;
  icon: string;
  description: string;
  highlights: string[];
  technologies: string[];
  status: 'live' | 'in-progress' | 'planned';
  internalRoute?: string;
  externalUrl?: string;
  githubUrl?: string;
}

/**
 * Public, portfolio-style AI / ML projects page.
 *
 * Replaces the previous auth-gated upload dashboard at the same nav slot.
 * The upload tool is still reachable to authenticated admins at
 * /admin/interactive-projects.
 *
 * Card layout intentionally mirrors the Full-Stack Projects page so the
 * two sections feel like one cohesive portfolio.
 */
@Component({
  selector: 'app-ai-projects',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ai-projects.component.html',
  styleUrl: './ai-projects.component.css',
})
export class AiProjectsComponent {
  projects: AiProject[] = [
    {
      id: 'portfolio-rag-chatbot',
      title: 'Portfolio RAG Chatbot',
      icon: '🤖',
      description:
        "The floating assistant on every page of this site. Answers questions about Clark's " +
        'background, projects, technologies, accessibility work, and documentation by retrieving ' +
        'from a curated knowledge base.',
      highlights: [
        'Retrieval-Augmented Generation pipeline embedded in the existing Spring Boot backend',
        'Spring AI + SimpleVectorStore (file-backed) — no extra infrastructure to operate',
        'OpenAI text-embedding-3-small for retrieval, gpt-5.4-mini for streamed answers',
        'Query expansion, semantic top-k retrieval, reranking, and inline citations',
        'WCAG 2.1 AA accessible: focus management, ARIA live regions, keyboard-first',
      ],
      technologies: ['Spring AI', 'OpenAI', 'RAG', 'Angular 21', 'SSE Streaming'],
      status: 'live',
      githubUrl: 'https://github.com/clark22134/MyPortfolioWebsite',
    },
    {
      id: 'multimodal-search',
      title: 'Multimodal Search Engine',
      icon: '🔍',
      description:
        'Search across images and text using CLIP joint embeddings — query with text to find ' +
        'relevant images, or query with an image to find related text passages.',
      highlights: [
        'OpenAI CLIP (ViT-B/32) for joint text + image embedding space',
        'FAISS index for sub-millisecond approximate nearest-neighbor search',
        'Image preprocessing pipeline with normalization and tensor batching',
        'Cosine-similarity reranking for top results',
      ],
      technologies: ['CLIP', 'FAISS', 'PyTorch', 'FastAPI', 'NumPy'],
      status: 'in-progress',
    },
    {
      id: 'ml-pipeline-mlops',
      title: 'ML Pipeline with MLOps',
      icon: '📈',
      description:
        'End-to-end machine learning pipeline: feature engineering, training, model versioning ' +
        'with MLflow, and automated containerized deployment.',
      highlights: [
        'Reproducible feature engineering with DVC-style data versioning',
        'MLflow experiment tracking: parameters, metrics, artifacts, model registry',
        'Automated promotion from registry to containerized inference service',
        'Supports CSV, JSON, Parquet, and XLSX inputs up to 50 MB',
      ],
      technologies: ['MLflow', 'scikit-learn', 'Docker', 'GitHub Actions', 'Python'],
      status: 'in-progress',
    },
    {
      id: 'fine-tuned-llm',
      title: 'Fine-Tuned LLM',
      icon: '🧠',
      description:
        'Custom domain-specific language models fine-tuned with LoRA / QLoRA on HuggingFace ' +
        'transformers — keeps training affordable on consumer GPUs.',
      highlights: [
        'Parameter-efficient fine-tuning (LoRA / QLoRA) on open base models',
        'JSONL / JSON / CSV / TXT training inputs up to 25 MB',
        'Evaluation harness for domain-specific accuracy and safety regressions',
        'Designed for domain Q&A, structured extraction, and customer-support bots',
      ],
      technologies: ['HuggingFace', 'PEFT', 'LoRA / QLoRA', 'Transformers', 'PyTorch'],
      status: 'planned',
    },
  ];

  trackById(_: number, p: AiProject): string {
    return p.id;
  }
}
