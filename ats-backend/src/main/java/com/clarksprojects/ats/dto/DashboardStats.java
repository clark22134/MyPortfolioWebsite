package com.clarksprojects.ats.dto;

import lombok.*;

import java.util.Map;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DashboardStats {
    private long totalJobs;
    private long openJobs;
    private long totalCandidates;
    private Map<String, Long> candidatesByStage;
    private Map<String, Long> jobsByEmployer;
}
