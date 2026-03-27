package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.DashboardStats;
import com.clarksprojects.ats.entity.Job;
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

    @Mock
    private JobRepository jobRepository;

    @Mock
    private CandidateRepository candidateRepository;

    @InjectMocks
    private DashboardService dashboardService;

    @Test
    void getStats_returnsAggregatedCounts() {
        when(jobRepository.count()).thenReturn(6L);
        when(jobRepository.countByStatus(JobStatus.OPEN)).thenReturn(4L);
        when(candidateRepository.count()).thenReturn(13L);
        when(candidateRepository.countByStage(PipelineStage.APPLIED)).thenReturn(3L);
        when(candidateRepository.countByStage(PipelineStage.SCREENING)).thenReturn(3L);
        when(candidateRepository.countByStage(PipelineStage.INTERVIEW)).thenReturn(2L);
        when(candidateRepository.countByStage(PipelineStage.ASSESSMENT)).thenReturn(1L);
        when(candidateRepository.countByStage(PipelineStage.OFFER)).thenReturn(1L);
        when(candidateRepository.countByStage(PipelineStage.HIRED)).thenReturn(2L);
        when(candidateRepository.countByStage(PipelineStage.REJECTED)).thenReturn(1L);
        when(jobRepository.findAll()).thenReturn(List.of(
                Job.builder().employer("Acme").build(),
                Job.builder().employer("Acme").build(),
                Job.builder().employer("Acme").build(),
                Job.builder().employer("DataBridge").build(),
                Job.builder().employer("DataBridge").build(),
                Job.builder().employer("GrowthMedia").build()
        ));

        DashboardStats stats = dashboardService.getStats();

        assertThat(stats.getTotalJobs()).isEqualTo(6L);
        assertThat(stats.getOpenJobs()).isEqualTo(4L);
        assertThat(stats.getTotalCandidates()).isEqualTo(13L);
        assertThat(stats.getJobsByEmployer()).containsEntry("Acme", 3L);
        assertThat(stats.getJobsByEmployer()).containsEntry("DataBridge", 2L);
        assertThat(stats.getJobsByEmployer()).containsEntry("GrowthMedia", 1L);
    }

    @Test
    void getStats_jobsByEmployer_groupedByEmployer() {
        when(jobRepository.count()).thenReturn(4L);
        when(jobRepository.countByStatus(JobStatus.OPEN)).thenReturn(2L);
        when(candidateRepository.count()).thenReturn(0L);
        for (PipelineStage stage : PipelineStage.values()) {
            when(candidateRepository.countByStage(stage)).thenReturn(0L);
        }
        when(jobRepository.findAll()).thenReturn(List.of(
                Job.builder().employer("Acme").build(),
                Job.builder().employer("Acme").build(),
                Job.builder().employer("Pixel").build(),
                Job.builder().employer("Pixel").build()
        ));

        DashboardStats stats = dashboardService.getStats();

        assertThat(stats.getJobsByEmployer()).hasSize(2)
                .containsEntry("Acme", 2L)
                .containsEntry("Pixel", 2L);
    }

    @Test
    void getStats_candidatesByStage_containsAllStages() {
        when(jobRepository.count()).thenReturn(0L);
        when(jobRepository.countByStatus(JobStatus.OPEN)).thenReturn(0L);
        when(candidateRepository.count()).thenReturn(0L);
        for (PipelineStage stage : PipelineStage.values()) {
            when(candidateRepository.countByStage(stage)).thenReturn(0L);
        }

        DashboardStats stats = dashboardService.getStats();

        assertThat(stats.getCandidatesByStage()).containsKeys(
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
        when(jobRepository.count()).thenReturn(2L);
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

        assertThat(stats.getCandidatesByStage().get(PipelineStage.APPLIED.name())).isEqualTo(5L);
        assertThat(stats.getCandidatesByStage().get(PipelineStage.SCREENING.name())).isEqualTo(0L);
    }

    @Test
    void getStats_emptyDatabase_returnsZeroCounts() {
        when(jobRepository.count()).thenReturn(0L);
        when(jobRepository.countByStatus(JobStatus.OPEN)).thenReturn(0L);
        when(candidateRepository.count()).thenReturn(0L);
        for (PipelineStage stage : PipelineStage.values()) {
            when(candidateRepository.countByStage(stage)).thenReturn(0L);
        }

        DashboardStats stats = dashboardService.getStats();

        assertThat(stats.getTotalJobs()).isZero();
        assertThat(stats.getOpenJobs()).isZero();
        assertThat(stats.getTotalCandidates()).isZero();
        assertThat(stats.getCandidatesByStage().values()).containsOnly(0L);
        assertThat(stats.getJobsByEmployer()).isEmpty();
    }
}
