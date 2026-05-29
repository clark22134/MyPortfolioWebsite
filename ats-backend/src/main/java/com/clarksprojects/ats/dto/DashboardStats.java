package com.clarksprojects.ats.dto;

import java.util.List;
import java.util.Map;

/**
 * Aggregated metrics + at-a-glance lists for the dashboard. All counts come
 * from a single database round-trip per piece (no N+1) and the lists are
 * already bounded (top-N) so the SPA can render the dashboard from one call.
 */
public record DashboardStats(
        long totalJobs,
        long openJobs,
        long totalCandidates,
        long openTasks,
        long overdueTasks,
        long hiredThisMonth,
        Map<String, Long> candidatesByStage,
        Map<String, Long> jobsByEmployer,
        List<ActivityResponse> recentActivity,
        List<TaskResponse> upcomingTasks
) {}
