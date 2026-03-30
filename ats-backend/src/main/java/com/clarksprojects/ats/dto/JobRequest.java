package com.clarksprojects.ats.dto;

import com.clarksprojects.ats.entity.EmploymentType;
import com.clarksprojects.ats.entity.JobStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobRequest {

    @NotBlank(message = "Employer is required")
    @Size(max = 200, message = "Employer must not exceed 200 characters")
    private String employer;

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;

    @NotBlank(message = "Department is required")
    @Size(max = 200, message = "Department must not exceed 200 characters")
    private String department;

    @NotBlank(message = "Location is required")
    @Size(max = 200, message = "Location must not exceed 200 characters")
    private String location;

    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    private String description;

    @Size(max = 2000, message = "Required skills must not exceed 2000 characters")
    private String requiredSkills;

    @Size(max = 500, message = "Address must not exceed 500 characters")
    private String address;

    private Double latitude;

    private Double longitude;

    @NotNull(message = "Job status is required")
    private JobStatus status;

    @NotNull(message = "Employment type is required")
    private EmploymentType employmentType;
}
