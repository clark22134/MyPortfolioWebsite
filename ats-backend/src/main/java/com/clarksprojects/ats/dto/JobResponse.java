package com.clarksprojects.ats.dto;

import com.clarksprojects.ats.entity.EmploymentType;
import com.clarksprojects.ats.entity.JobStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class JobResponse {
    private Long id;
    private String employer;
    private String title;
    private String department;
    private String location;
    private String description;
    private String requiredSkills;
    private String address;
    private Double latitude;
    private Double longitude;
    private JobStatus status;
    private EmploymentType employmentType;
    private int candidateCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
