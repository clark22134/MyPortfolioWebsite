package com.clarksprojects.ats.dto;

import java.util.Map;

public record DashboardStats(
        long totalJobs,
        long openJobs,
        long totalCandidates,
        Map<String, Long> candidatesByStage,
        Map<String, Long> jobsByEmployer
) {}
