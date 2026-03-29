package com.clarksprojects.ats.dto;

import com.clarksprojects.ats.entity.PipelineStage;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class CandidateRequest {

    @NotBlank
    @Size(max = 100)
    private String firstName;

    @NotBlank
    @Size(max = 100)
    private String lastName;

    @NotBlank @Email
    @Size(max = 255)
    private String email;

    @Size(max = 30)
    private String phone;

    @Size(max = 500)
    private String resumeUrl;

    @Size(max = 5000)
    private String notes;

    @Size(max = 2000)
    private String skills;

    @Size(max = 500)
    private String address;

    private Double latitude;

    private Double longitude;

    private Integer lastAssignmentDays;

    @NotNull
    private PipelineStage stage;

    @NotNull
    private Long jobId;
}
