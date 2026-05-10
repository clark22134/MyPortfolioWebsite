package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.JobRequest;
import com.clarksprojects.ats.dto.JobResponse;
import com.clarksprojects.ats.dto.TopCandidateMatch;
import com.clarksprojects.ats.entity.Candidate;
import com.clarksprojects.ats.entity.EmploymentType;
import com.clarksprojects.ats.entity.Job;
import com.clarksprojects.ats.entity.JobStatus;
import com.clarksprojects.ats.entity.PipelineStage;
import com.clarksprojects.ats.exception.ResourceNotFoundException;
import com.clarksprojects.ats.repository.CandidateRepository;
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

    @Mock
    private CandidateRepository candidateRepository;

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
    void getJob_nonExistentId_throwsResourceNotFoundException() {
        when(jobRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobService.getJob(99L))
                .isInstanceOf(ResourceNotFoundException.class)
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
    void updateJob_nonExistentId_throwsResourceNotFoundException() {
        when(jobRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobService.updateJob(99L, new JobRequest()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Job not found: 99");
    }

    @Test
    void deleteJob_existingId_deletesJob() {
        when(jobRepository.findById(1L)).thenReturn(Optional.of(sampleJob));

        jobService.deleteJob(1L);

        verify(jobRepository).delete(sampleJob);
    }

    @Test
    void deleteJob_nonExistentId_throwsResourceNotFoundException() {
        when(jobRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobService.deleteJob(99L))
                .isInstanceOf(ResourceNotFoundException.class)
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
    void findJobOrThrow_missingId_throwsResourceNotFoundException() {
        when(jobRepository.findById(5L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobService.findJobOrThrow(5L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Job not found: 5");
    }

    // ── getAllJobs talent-pool filtering ──────────────────────────────────────

    @Test
    void getAllJobs_filtersTalentPoolJobFromResult() {
        Job talentPoolJob = Job.builder()
                .id(99L)
                .employer(JobService.TALENT_POOL_EMPLOYER)
                .title(JobService.TALENT_POOL_TITLE)
                .department(JobService.TALENT_POOL_DEPARTMENT)
                .location("N/A")
                .status(JobStatus.ON_HOLD)
                .employmentType(EmploymentType.FULL_TIME)
                .candidates(new ArrayList<>())
                .build();

        when(jobRepository.findAll()).thenReturn(List.of(sampleJob, talentPoolJob));

        List<JobResponse> result = jobService.getAllJobs();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("Software Engineer");
    }

    // ── getJobsByStatus talent-pool filtering ─────────────────────────────────

    @Test
    void getJobsByStatus_filtersTalentPoolJobFromResult() {
        Job talentPoolJob = Job.builder()
                .id(99L)
                .employer(JobService.TALENT_POOL_EMPLOYER)
                .title(JobService.TALENT_POOL_TITLE)
                .department(JobService.TALENT_POOL_DEPARTMENT)
                .location("N/A")
                .status(JobStatus.ON_HOLD)
                .employmentType(EmploymentType.FULL_TIME)
                .candidates(new ArrayList<>())
                .build();

        when(jobRepository.findByStatusOrderByCreatedAtDesc(JobStatus.ON_HOLD))
                .thenReturn(List.of(sampleJob, talentPoolJob));

        List<JobResponse> result = jobService.getJobsByStatus(JobStatus.ON_HOLD);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(1L);
    }

    // ── getJobsByEmployer ─────────────────────────────────────────────────────

    @Test
    void getJobsByEmployer_returnsMatchingJobs() {
        when(jobRepository.findByEmployerIgnoreCaseOrderByCreatedAtDesc("Acme Technologies"))
                .thenReturn(List.of(sampleJob));

        List<JobResponse> result = jobService.getJobsByEmployer("Acme Technologies");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmployer()).isEqualTo("Acme Technologies");
        verify(jobRepository).findByEmployerIgnoreCaseOrderByCreatedAtDesc("Acme Technologies");
    }

    @Test
    void getJobsByEmployer_noMatches_returnsEmptyList() {
        when(jobRepository.findByEmployerIgnoreCaseOrderByCreatedAtDesc("Unknown Corp"))
                .thenReturn(List.of());

        List<JobResponse> result = jobService.getJobsByEmployer("Unknown Corp");

        assertThat(result).isEmpty();
    }

    // ── findOrCreateTalentPoolJob ─────────────────────────────────────────────

    @Test
    void findOrCreateTalentPoolJob_returnsExistingWhenFound() {
        Job existing = Job.builder()
                .id(99L)
                .employer(JobService.TALENT_POOL_EMPLOYER)
                .title(JobService.TALENT_POOL_TITLE)
                .candidates(new ArrayList<>())
                .build();

        when(jobRepository.findByEmployerAndTitle(JobService.TALENT_POOL_EMPLOYER, JobService.TALENT_POOL_TITLE))
                .thenReturn(Optional.of(existing));

        Job result = jobService.findOrCreateTalentPoolJob();

        assertThat(result.getId()).isEqualTo(99L);
        verify(jobRepository, never()).save(any());
    }

    @Test
    void findOrCreateTalentPoolJob_createsNewWhenAbsent() {
        Job created = Job.builder()
                .id(100L)
                .employer(JobService.TALENT_POOL_EMPLOYER)
                .title(JobService.TALENT_POOL_TITLE)
                .department(JobService.TALENT_POOL_DEPARTMENT)
                .candidates(new ArrayList<>())
                .build();

        when(jobRepository.findByEmployerAndTitle(JobService.TALENT_POOL_EMPLOYER, JobService.TALENT_POOL_TITLE))
                .thenReturn(Optional.empty());
        when(jobRepository.save(any(Job.class))).thenReturn(created);

        Job result = jobService.findOrCreateTalentPoolJob();

        assertThat(result.getId()).isEqualTo(100L);
        assertThat(result.getTitle()).isEqualTo(JobService.TALENT_POOL_TITLE);
        verify(jobRepository).save(any(Job.class));
    }

    // ── getTopCandidates ─────────────────────────────────────────────────────

    @Test
    void getTopCandidates_jobHasNoRequiredSkills_returnsEmptyList() {
        Job job = Job.builder()
                .id(1L)
                .employer("Acme")
                .title("Dev")
                .requiredSkills(null)
                .status(JobStatus.OPEN)
                .employmentType(EmploymentType.FULL_TIME)
                .candidates(new ArrayList<>())
                .build();

        when(jobRepository.findById(1L)).thenReturn(Optional.of(job));

        List<TopCandidateMatch> result = jobService.getTopCandidates(1L);

        assertThat(result).isEmpty();
        verify(candidateRepository, never()).findAll();
    }

    @Test
    void getTopCandidates_candidateWithMatchingSkills_isIncluded() {
        Job job = Job.builder()
                .id(1L)
                .employer("Acme")
                .title("Dev")
                .requiredSkills("Java, Spring")
                .status(JobStatus.OPEN)
                .employmentType(EmploymentType.FULL_TIME)
                .candidates(new ArrayList<>())
                .build();

        Candidate matching = Candidate.builder()
                .id(10L)
                .firstName("Alice")
                .lastName("Smith")
                .email("alice@example.com")
                .skills("Java, Spring, Docker")
                .stage(PipelineStage.APPLIED)
                .stageOrder(0)
                .job(sampleJob)
                .build();

        when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
        when(candidateRepository.findAll()).thenReturn(List.of(matching));

        List<TopCandidateMatch> result = jobService.getTopCandidates(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).candidateId()).isEqualTo(10L);
        assertThat(result.get(0).skillsMatchPercent()).isEqualTo(100);
    }

    @Test
    void getTopCandidates_candidateWithNoMatchingSkills_isFiltered() {
        Job job = Job.builder()
                .id(1L)
                .employer("Acme")
                .title("Dev")
                .requiredSkills("Java, Spring")
                .status(JobStatus.OPEN)
                .employmentType(EmploymentType.FULL_TIME)
                .candidates(new ArrayList<>())
                .build();

        Candidate noMatch = Candidate.builder()
                .id(20L)
                .firstName("Bob")
                .lastName("Jones")
                .email("bob@example.com")
                .skills("Python, Django")
                .stage(PipelineStage.APPLIED)
                .stageOrder(0)
                .job(sampleJob)
                .build();

        when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
        when(candidateRepository.findAll()).thenReturn(List.of(noMatch));

        List<TopCandidateMatch> result = jobService.getTopCandidates(1L);

        assertThat(result).isEmpty();
    }

    @Test
    void getTopCandidates_withGeoCoordsOnBothJobAndCandidate_includesDistanceInResult() {
        Job job = Job.builder()
                .id(1L)
                .employer("Acme")
                .title("Dev")
                .requiredSkills("Java")
                .latitude(37.3382)
                .longitude(-121.8863)  // San Jose, CA
                .status(JobStatus.OPEN)
                .employmentType(EmploymentType.FULL_TIME)
                .candidates(new ArrayList<>())
                .build();

        Candidate candidate = Candidate.builder()
                .id(10L)
                .firstName("Alice")
                .lastName("Smith")
                .email("alice@example.com")
                .skills("Java")
                .latitude(37.7749)
                .longitude(-122.4194)  // San Francisco, CA
                .stage(PipelineStage.APPLIED)
                .stageOrder(0)
                .job(sampleJob)
                .build();

        when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
        when(candidateRepository.findAll()).thenReturn(List.of(candidate));

        List<TopCandidateMatch> result = jobService.getTopCandidates(1L);

        assertThat(result).hasSize(1);
        // Distance SJ → SF is ~48 miles — should be populated
        assertThat(result.get(0).distanceMiles()).isGreaterThan(40.0);
        assertThat(result.get(0).distanceMiles()).isLessThan(60.0);
    }

    @Test
    void getTopCandidates_moreThanFiveCandidates_limitsResultToFive() {
        Job job = Job.builder()
                .id(1L)
                .employer("Acme")
                .title("Dev")
                .requiredSkills("Java")
                .status(JobStatus.OPEN)
                .employmentType(EmploymentType.FULL_TIME)
                .candidates(new ArrayList<>())
                .build();

        List<Candidate> candidates = new ArrayList<>();
        for (int i = 1; i <= 8; i++) {
            candidates.add(Candidate.builder()
                    .id((long) i)
                    .firstName("Candidate")
                    .lastName("Number" + i)
                    .email("c" + i + "@example.com")
                    .skills("Java, Spring")
                    .stage(PipelineStage.APPLIED)
                    .stageOrder(0)
                    .job(sampleJob)
                    .build());
        }

        when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
        when(candidateRepository.findAll()).thenReturn(candidates);

        List<TopCandidateMatch> result = jobService.getTopCandidates(1L);

        assertThat(result).hasSize(5);
    }

    @Test
    void getTopCandidates_candidateWithNullSkills_isFiltered() {
        Job job = Job.builder()
                .id(1L)
                .employer("Acme")
                .title("Dev")
                .requiredSkills("Java")
                .status(JobStatus.OPEN)
                .employmentType(EmploymentType.FULL_TIME)
                .candidates(new ArrayList<>())
                .build();

        Candidate noSkills = Candidate.builder()
                .id(5L)
                .firstName("Dave")
                .lastName("Blank")
                .email("dave@example.com")
                .skills(null)
                .stage(PipelineStage.APPLIED)
                .stageOrder(0)
                .job(sampleJob)
                .build();

        when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
        when(candidateRepository.findAll()).thenReturn(List.of(noSkills));

        List<TopCandidateMatch> result = jobService.getTopCandidates(1L);

        assertThat(result).isEmpty();
    }
}
