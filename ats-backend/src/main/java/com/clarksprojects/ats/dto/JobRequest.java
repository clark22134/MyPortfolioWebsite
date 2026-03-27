package com.clarksprojects.ats.dto;

import com.clarksprojects.ats.entity.EmploymentType;
import com.clarksprojects.ats.entity.JobStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class JobRequest {

    @NotBlank
    private String employer;

    @NotBlank
    private String title;

    @NotBlank
    private String department;

    @NotBlank
    private String location;

    private String description;

    @NotNull
    private JobStatus status;

    @NotNull
    private EmploymentType employmentType;
}
