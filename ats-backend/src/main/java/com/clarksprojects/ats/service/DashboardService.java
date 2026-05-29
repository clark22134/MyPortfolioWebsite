package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.ActivityResponse;
import com.clarksprojects.ats.dto.DashboardStats;
import com.clarksprojects.ats.dto.TaskResponse;
import com.clarksprojects.ats.entity.JobStatus;
import com.clarksprojects.ats.entity.PipelineStage;
import com.clarksprojects.ats.entity.TaskStatus;
import com.clarksprojects.ats.repository.CandidateRepository;
import com.clarksprojects.ats.repository.FollowUpTaskRepository;
import com.clarksprojects.ats.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private static final int RECENT_ACTIVITY_LIMIT = 10;
    private static final int UPCOMING_TASKS_LIMIT = 5;

    private final JobRepository jobRepository;
    private final CandidateRepository candidateRepository;
    private final FollowUpTaskRepository taskRepository;
    private final ActivityService activityService;

    @Transactional(readOnly = true)
    public DashboardStats getStats() {
        Map<String, Long> byStage = new LinkedHashMap<>();
        for (PipelineStage stage : PipelineStage.values()) {
            byStage.put(stage.name(), candidateRepository.countByStage(stage));
        }
        Map<String, Long> byEmployer = jobRepository
                .countJobsGroupedByEmployer(JobService.TALENT_POOL_EMPLOYER)
                .stream()
                .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));

        long openTasks = taskRepository.countByStatus(TaskStatus.OPEN);
        long overdueTasks = taskRepository.countByStatusAndDueAtBefore(TaskStatus.OPEN, LocalDateTime.now());
        long hiredThisMonth = candidateRepository.countHiredSince(
                LocalDate.now().withDayOfMonth(1).atStartOfDay());

        List<ActivityResponse> recent = activityService.recent(RECENT_ACTIVITY_LIMIT);
        List<TaskResponse> upcoming = taskRepository
                .findTop5ByStatusOrderByDueAtAscCreatedAtAsc(TaskStatus.OPEN)
                .stream()
                .limit(UPCOMING_TASKS_LIMIT)
                .map(TaskResponse::from)
                .toList();

        return new DashboardStats(
                jobRepository.countByEmployerNot(JobService.TALENT_POOL_EMPLOYER),
                jobRepository.countByStatus(JobStatus.OPEN),
                candidateRepository.count(),
                openTasks,
                overdueTasks,
                hiredThisMonth,
                byStage,
                byEmployer,
                recent,
                upcoming
        );
    }
}
