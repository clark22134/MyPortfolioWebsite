package com.clarksprojects.ats.dto;

import com.clarksprojects.ats.entity.EmploymentType;
import com.clarksprojects.ats.entity.JobStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class JobRequest {

    @NotBlank
    @Size(max = 200)
    private String employer;

    @NotBlank
    @Size(max = 200)
    private String title;

    @NotBlank
    @Size(max = 200)
    private String department;

    @NotBlank
    @Size(max = 200)
    private String location;

    @Size(max = 5000)
    private String description;

    @Size(max = 2000)
    private String requiredSkills;

    @Size(max = 500)
    private String address;

    private Double latitude;

    private Double longitude;

    @NotNull
    private JobStatus status;

    @NotNull
    private EmploymentType employmentType;
}
