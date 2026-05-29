package com.clarksprojects.ats.dto;

import com.clarksprojects.ats.entity.TaskStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskStatusRequest {
    @NotNull
    private TaskStatus status;
}
