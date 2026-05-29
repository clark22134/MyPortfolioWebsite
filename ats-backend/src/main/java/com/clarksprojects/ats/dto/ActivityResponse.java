package com.clarksprojects.ats.dto;

import com.clarksprojects.ats.entity.Activity;
import com.clarksprojects.ats.entity.ActivityType;

import java.time.LocalDateTime;

public record ActivityResponse(
        Long id,
        ActivityType type,
        Long candidateId,
        String candidateName,
        Long jobId,
        String jobTitle,
        Long actorId,
        String actorName,
        String summary,
        String metadata,
        LocalDateTime createdAt
) {
    public static ActivityResponse from(Activity a) {
        return new ActivityResponse(
                a.getId(),
                a.getType(),
                a.getCandidate() != null ? a.getCandidate().getId() : null,
                a.getCandidate() != null ? a.getCandidate().getFirstName() + " " + a.getCandidate().getLastName() : null,
                a.getJob() != null ? a.getJob().getId() : null,
                a.getJob() != null ? a.getJob().getTitle() : null,
                a.getActor() != null ? a.getActor().getId() : null,
                a.getActor() != null ? a.getActor().getFullName() : "System",
                a.getSummary(),
                a.getMetadata(),
                a.getCreatedAt()
        );
    }
}
