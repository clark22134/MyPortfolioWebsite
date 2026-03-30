package com.clarksprojects.ats.dto;

import com.clarksprojects.ats.entity.PipelineStage;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StageMoveRequest {

    @NotNull(message = "New stage is required")
    private PipelineStage newStage;

    private Integer newOrder;
}
