package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.DashboardStats;
import com.clarksprojects.ats.entity.JobStatus;
import com.clarksprojects.ats.entity.PipelineStage;
import com.clarksprojects.ats.repository.CandidateRepository;
import com.clarksprojects.ats.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final JobRepository jobRepository;
    private final CandidateRepository candidateRepository;

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

        return DashboardStats.builder()
                .totalJobs(jobRepository.countByEmployerNot(JobService.TALENT_POOL_EMPLOYER))
                .openJobs(jobRepository.countByStatus(JobStatus.OPEN))
                .totalCandidates(candidateRepository.count())
                .candidatesByStage(byStage)
                .jobsByEmployer(byEmployer)
                .build();
    }
}
