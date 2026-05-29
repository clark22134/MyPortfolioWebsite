package com.clarksprojects.ats.dto;

import com.clarksprojects.ats.entity.TaskPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskRequest {
    @NotBlank
    @Size(max = 255)
    private String subject;

    @Size(max = 5000)
    private String description;

    private Long candidateId;
    private Long jobId;
    private Long assigneeId;
    private TaskPriority priority;
    private LocalDateTime dueAt;
}
