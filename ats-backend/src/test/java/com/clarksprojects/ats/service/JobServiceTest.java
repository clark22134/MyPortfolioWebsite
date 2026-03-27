package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.JobRequest;
import com.clarksprojects.ats.dto.JobResponse;
import com.clarksprojects.ats.entity.EmploymentType;
import com.clarksprojects.ats.entity.Job;
import com.clarksprojects.ats.entity.JobStatus;
import com.clarksprojects.ats.repository.JobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JobServiceTest {

    @Mock
    private JobRepository jobRepository;

    @InjectMocks
    private JobService jobService;

    private Job sampleJob;

    @BeforeEach
    void setUp() {
        sampleJob = Job.builder()
                .id(1L)
                .employer("Acme Technologies")
                .title("Software Engineer")
                .department("Engineering")
                .location("Remote")
                .description("Build great software")
                .status(JobStatus.OPEN)
                .employmentType(EmploymentType.FULL_TIME)
                .candidates(new ArrayList<>())
                .build();
    }

    @Test
    void getAllJobs_returnsMappedResponses() {
        when(jobRepository.findAll()).thenReturn(List.of(sampleJob));

        List<JobResponse> result = jobService.getAllJobs();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("Software Engineer");
        assertThat(result.get(0).getStatus()).isEqualTo(JobStatus.OPEN);
        assertThat(result.get(0).getCandidateCount()).isZero();
    }

    @Test
    void getAllJobs_emptyRepository_returnsEmptyList() {
        when(jobRepository.findAll()).thenReturn(List.of());

        assertThat(jobService.getAllJobs()).isEmpty();
    }

    @Test
    void getJobsByStatus_filtersCorrectly() {
        when(jobRepository.findByStatusOrderByCreatedAtDesc(JobStatus.OPEN)).thenReturn(List.of(sampleJob));

        List<JobResponse> result = jobService.getJobsByStatus(JobStatus.OPEN);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatus()).isEqualTo(JobStatus.OPEN);
        verify(jobRepository).findByStatusOrderByCreatedAtDesc(JobStatus.OPEN);
    }

    @Test
    void getJob_existingId_returnsResponse() {
        when(jobRepository.findById(1L)).thenReturn(Optional.of(sampleJob));

        JobResponse result = jobService.getJob(1L);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getTitle()).isEqualTo("Software Engineer");
        assertThat(result.getDepartment()).isEqualTo("Engineering");
    }

    @Test
    void getJob_nonExistentId_throwsIllegalArgumentException() {
        when(jobRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobService.getJob(99L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Job not found: 99");
    }

    @Test
    void createJob_savesAndReturnsResponse() {
        JobRequest request = JobRequest.builder()
                .employer("Acme Technologies")
                .title("DevOps Engineer")
                .department("Platform")
                .location("Hybrid")
                .description("CI/CD pipelines")
                .status(JobStatus.OPEN)
                .employmentType(EmploymentType.FULL_TIME)
                .build();

        Job saved = Job.builder()
                .id(2L)
                .employer("Acme Technologies")
                .title("DevOps Engineer")
                .department("Platform")
                .location("Hybrid")
                .description("CI/CD pipelines")
                .status(JobStatus.OPEN)
                .employmentType(EmploymentType.FULL_TIME)
                .candidates(new ArrayList<>())
                .build();

        when(jobRepository.save(any(Job.class))).thenReturn(saved);

        JobResponse result = jobService.createJob(request);

        assertThat(result.getId()).isEqualTo(2L);
        assertThat(result.getTitle()).isEqualTo("DevOps Engineer");
        assertThat(result.getEmployer()).isEqualTo("Acme Technologies");
        assertThat(result.getEmploymentType()).isEqualTo(EmploymentType.FULL_TIME);
        verify(jobRepository).save(any(Job.class));
    }

    @Test
    void updateJob_existingId_updatesAndReturns() {
        JobRequest request = JobRequest.builder()
                .employer("Acme Technologies")
                .title("Senior Software Engineer")
                .department("Engineering")
                .location("Remote")
                .description("Updated description")
                .status(JobStatus.CLOSED)
                .employmentType(EmploymentType.CONTRACT)
                .build();

        when(jobRepository.findById(1L)).thenReturn(Optional.of(sampleJob));
        when(jobRepository.save(any(Job.class))).thenAnswer(inv -> inv.getArgument(0));

        JobResponse result = jobService.updateJob(1L, request);

        assertThat(result.getTitle()).isEqualTo("Senior Software Engineer");
        assertThat(result.getStatus()).isEqualTo(JobStatus.CLOSED);
        assertThat(result.getEmploymentType()).isEqualTo(EmploymentType.CONTRACT);
    }

    @Test
    void updateJob_nonExistentId_throwsIllegalArgumentException() {
        when(jobRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobService.updateJob(99L, new JobRequest()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Job not found: 99");
    }

    @Test
    void deleteJob_existingId_deletesJob() {
        when(jobRepository.findById(1L)).thenReturn(Optional.of(sampleJob));

        jobService.deleteJob(1L);

        verify(jobRepository).delete(sampleJob);
    }

    @Test
    void deleteJob_nonExistentId_throwsIllegalArgumentException() {
        when(jobRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobService.deleteJob(99L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Job not found: 99");
        verify(jobRepository, never()).delete(any());
    }

    @Test
    void findJobOrThrow_existingId_returnsJob() {
        when(jobRepository.findById(1L)).thenReturn(Optional.of(sampleJob));

        Job result = jobService.findJobOrThrow(1L);

        assertThat(result).isSameAs(sampleJob);
    }

    @Test
    void findJobOrThrow_missingId_throwsIllegalArgumentException() {
        when(jobRepository.findById(5L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobService.findJobOrThrow(5L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Job not found: 5");
    }
}
