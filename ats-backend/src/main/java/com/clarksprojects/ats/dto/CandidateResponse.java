package com.clarksprojects.ats.dto;

import com.clarksprojects.ats.entity.PipelineStage;
import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class CandidateResponse {
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String resumeUrl;
    private String notes;
    private String skills;
    private String address;
    private Double latitude;
    private Double longitude;
    private Integer lastAssignmentDays;
    private PipelineStage stage;
    private Integer stageOrder;
    private Long jobId;
    private String jobTitle;
    private boolean talentPool;
    private LocalDateTime appliedAt;
    private LocalDateTime updatedAt;
}
