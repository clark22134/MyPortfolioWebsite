package com.clarksprojects.ats.dto;

import com.clarksprojects.ats.entity.PipelineStage;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class CandidateRequest {

    @NotBlank
    private String firstName;

    @NotBlank
    private String lastName;

    @NotBlank @Email
    private String email;

    private String phone;

    private String resumeUrl;

    private String notes;

    @NotNull
    private PipelineStage stage;

    @NotNull
    private Long jobId;
}
