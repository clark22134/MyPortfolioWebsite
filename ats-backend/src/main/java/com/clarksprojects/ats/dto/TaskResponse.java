package com.clarksprojects.ats.dto;

import com.clarksprojects.ats.entity.FollowUpTask;
import com.clarksprojects.ats.entity.TaskPriority;
import com.clarksprojects.ats.entity.TaskStatus;

import java.time.LocalDateTime;

public record TaskResponse(
        Long id,
        String subject,
        String description,
        Long candidateId,
        String candidateName,
        Long jobId,
        String jobTitle,
        Long assigneeId,
        String assigneeName,
        Long creatorId,
        String creatorName,
        TaskPriority priority,
        TaskStatus status,
        LocalDateTime dueAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime completedAt
) {
    public static TaskResponse from(FollowUpTask t) {
        return new TaskResponse(
                t.getId(),
                t.getSubject(),
                t.getDescription(),
                t.getCandidate() != null ? t.getCandidate().getId() : null,
                t.getCandidate() != null ? t.getCandidate().getFirstName() + " " + t.getCandidate().getLastName() : null,
                t.getJob() != null ? t.getJob().getId() : null,
                t.getJob() != null ? t.getJob().getTitle() : null,
                t.getAssignee() != null ? t.getAssignee().getId() : null,
                t.getAssignee() != null ? t.getAssignee().getFullName() : "Unassigned",
                t.getCreator() != null ? t.getCreator().getId() : null,
                t.getCreator() != null ? t.getCreator().getFullName() : "System",
                t.getPriority(),
                t.getStatus(),
                t.getDueAt(),
                t.getCreatedAt(),
                t.getUpdatedAt(),
                t.getCompletedAt()
        );
    }
}
