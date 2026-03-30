package com.clarksprojects.ats.dto;

import com.clarksprojects.ats.entity.PipelineStage;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateRequest {

    @NotBlank(message = "First name is required")
    @Size(max = 100, message = "First name must not exceed 100 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(max = 100, message = "Last name must not exceed 100 characters")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    private String email;

    @Size(max = 30, message = "Phone must not exceed 30 characters")
    private String phone;

    @Size(max = 500, message = "Resume URL must not exceed 500 characters")
    private String resumeUrl;

    @Size(max = 5000, message = "Notes must not exceed 5000 characters")
    private String notes;

    @Size(max = 2000, message = "Skills must not exceed 2000 characters")
    private String skills;

    @Size(max = 500, message = "Address must not exceed 500 characters")
    private String address;

    private Double latitude;

    private Double longitude;

    private Integer lastAssignmentDays;

    @NotNull(message = "Pipeline stage is required")
    private PipelineStage stage;

    @NotNull(message = "Job ID is required")
    private Long jobId;
}
