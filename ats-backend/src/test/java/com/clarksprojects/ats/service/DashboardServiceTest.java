package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.DashboardStats;
import com.clarksprojects.ats.entity.JobStatus;
import com.clarksprojects.ats.entity.PipelineStage;
import com.clarksprojects.ats.repository.CandidateRepository;
import com.clarksprojects.ats.repository.JobRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    private static final String SYSTEM_EMPLOYER = JobService.TALENT_POOL_EMPLOYER;

    @Mock
    private JobRepository jobRepository;

    @Mock
    private CandidateRepository candidateRepository;

    @InjectMocks
    private DashboardService dashboardService;

    @Test
    void getStats_returnsAggregatedCounts() {
        when(jobRepository.countByEmployerNot(SYSTEM_EMPLOYER)).thenReturn(6L);
        when(jobRepository.countByStatus(JobStatus.OPEN)).thenReturn(4L);
        when(candidateRepository.count()).thenReturn(13L);
        when(candidateRepository.countByStage(PipelineStage.APPLIED)).thenReturn(3L);
        when(candidateRepository.countByStage(PipelineStage.SCREENING)).thenReturn(3L);
        when(candidateRepository.countByStage(PipelineStage.INTERVIEW)).thenReturn(2L);
        when(candidateRepository.countByStage(PipelineStage.ASSESSMENT)).thenReturn(1L);
        when(candidateRepository.countByStage(PipelineStage.OFFER)).thenReturn(1L);
        when(candidateRepository.countByStage(PipelineStage.HIRED)).thenReturn(2L);
        when(candidateRepository.countByStage(PipelineStage.REJECTED)).thenReturn(1L);
        when(jobRepository.countJobsGroupedByEmployer(SYSTEM_EMPLOYER)).thenReturn(List.of(
                new Object[]{"Acme", 3L},
                new Object[]{"DataBridge", 2L},
                new Object[]{"GrowthMedia", 1L}
        ));

        DashboardStats stats = dashboardService.getStats();

        assertThat(stats.totalJobs()).isEqualTo(6L);
        assertThat(stats.openJobs()).isEqualTo(4L);
        assertThat(stats.totalCandidates()).isEqualTo(13L);
        assertThat(stats.jobsByEmployer()).containsEntry("Acme", 3L);
        assertThat(stats.jobsByEmployer()).containsEntry("DataBridge", 2L);
        assertThat(stats.jobsByEmployer()).containsEntry("GrowthMedia", 1L);
    }

    @Test
    void getStats_jobsByEmployer_groupedByEmployer() {
        when(jobRepository.countByEmployerNot(SYSTEM_EMPLOYER)).thenReturn(4L);
        when(jobRepository.countByStatus(JobStatus.OPEN)).thenReturn(2L);
        when(candidateRepository.count()).thenReturn(0L);
        for (PipelineStage stage : PipelineStage.values()) {
            when(candidateRepository.countByStage(stage)).thenReturn(0L);
        }
        when(jobRepository.countJobsGroupedByEmployer(SYSTEM_EMPLOYER)).thenReturn(List.of(
                new Object[]{"Acme", 2L},
                new Object[]{"Pixel", 2L}
        ));

        DashboardStats stats = dashboardService.getStats();

        assertThat(stats.jobsByEmployer()).hasSize(2)
                .containsEntry("Acme", 2L)
                .containsEntry("Pixel", 2L);
    }

    @Test
    void getStats_candidatesByStage_containsAllStages() {
        when(jobRepository.countByStatus(JobStatus.OPEN)).thenReturn(0L);
        when(candidateRepository.count()).thenReturn(0L);
        for (PipelineStage stage : PipelineStage.values()) {
            when(candidateRepository.countByStage(stage)).thenReturn(0L);
        }

        DashboardStats stats = dashboardService.getStats();

        assertThat(stats.candidatesByStage()).containsKeys(
                PipelineStage.APPLIED.name(),
                PipelineStage.SCREENING.name(),
                PipelineStage.INTERVIEW.name(),
                PipelineStage.ASSESSMENT.name(),
                PipelineStage.OFFER.name(),
                PipelineStage.HIRED.name(),
                PipelineStage.REJECTED.name()
        );
    }

    @Test
    void getStats_candidatesByStage_valuesMatchRepositoryCounts() {
        when(jobRepository.countByStatus(JobStatus.OPEN)).thenReturn(1L);
        when(candidateRepository.count()).thenReturn(5L);
        when(candidateRepository.countByStage(PipelineStage.APPLIED)).thenReturn(5L);
        when(candidateRepository.countByStage(PipelineStage.SCREENING)).thenReturn(0L);
        when(candidateRepository.countByStage(PipelineStage.INTERVIEW)).thenReturn(0L);
        when(candidateRepository.countByStage(PipelineStage.ASSESSMENT)).thenReturn(0L);
        when(candidateRepository.countByStage(PipelineStage.OFFER)).thenReturn(0L);
        when(candidateRepository.countByStage(PipelineStage.HIRED)).thenReturn(0L);
        when(candidateRepository.countByStage(PipelineStage.REJECTED)).thenReturn(0L);

        DashboardStats stats = dashboardService.getStats();

        assertThat(stats.candidatesByStage().get(PipelineStage.APPLIED.name())).isEqualTo(5L);
        assertThat(stats.candidatesByStage().get(PipelineStage.SCREENING.name())).isEqualTo(0L);
    }

    @Test
    void getStats_emptyDatabase_returnsZeroCounts() {
        when(jobRepository.countByEmployerNot(SYSTEM_EMPLOYER)).thenReturn(0L);
        when(jobRepository.countByStatus(JobStatus.OPEN)).thenReturn(0L);
        when(candidateRepository.count()).thenReturn(0L);
        for (PipelineStage stage : PipelineStage.values()) {
            when(candidateRepository.countByStage(stage)).thenReturn(0L);
        }

        DashboardStats stats = dashboardService.getStats();

        assertThat(stats.totalJobs()).isZero();
        assertThat(stats.openJobs()).isZero();
        assertThat(stats.totalCandidates()).isZero();
        assertThat(stats.candidatesByStage().values()).containsOnly(0L);
        assertThat(stats.jobsByEmployer()).isEmpty();
    }
}
