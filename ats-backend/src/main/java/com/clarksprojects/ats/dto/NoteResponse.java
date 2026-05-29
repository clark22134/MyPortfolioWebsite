package com.clarksprojects.ats.dto;

import com.clarksprojects.ats.entity.CandidateNote;

import java.time.LocalDateTime;

public record NoteResponse(
        Long id,
        Long candidateId,
        Long authorId,
        String authorName,
        String body,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static NoteResponse from(CandidateNote note) {
        return new NoteResponse(
                note.getId(),
                note.getCandidate().getId(),
                note.getAuthor() != null ? note.getAuthor().getId() : null,
                note.getAuthor() != null ? note.getAuthor().getFullName() : "System",
                note.getBody(),
                note.getCreatedAt(),
                note.getUpdatedAt()
        );
    }
}
