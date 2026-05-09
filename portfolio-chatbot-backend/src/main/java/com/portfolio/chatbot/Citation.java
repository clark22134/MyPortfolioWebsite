package com.portfolio.chatbot;

/** A retrieved knowledge passage cited inline in chatbot answers. */
public record Citation(int index, String title, String section, String source) {
}
