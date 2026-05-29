package com.clarksprojects.ats.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TagAssignmentRequest {
    @NotNull
    private Set<Long> tagIds;
}
