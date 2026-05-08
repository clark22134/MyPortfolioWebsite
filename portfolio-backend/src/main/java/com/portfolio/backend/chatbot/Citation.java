package com.portfolio.backend.chatbot;

/**
 * Source attribution for a single retrieved passage.
 *
 * @param index   1-based citation index used by the LLM ({@code [1]}, {@code [2]}…)
 * @param title   front-matter title or document title
 * @param section H1/H2 section heading inside the source document
 * @param source  origin (e.g. {@code knowledge/projects.md}, {@code docs/ARCHITECTURE.md},
 *                or {@code db:project:42})
 */
public record Citation(int index, String title, String section, String source) {
}
