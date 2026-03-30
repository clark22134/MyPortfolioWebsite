package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.CandidateRequest;
import com.clarksprojects.ats.dto.CandidateResponse;
import com.clarksprojects.ats.dto.StageMoveRequest;
import com.clarksprojects.ats.entity.Candidate;
import com.clarksprojects.ats.entity.EmploymentType;
import com.clarksprojects.ats.entity.Job;
import com.clarksprojects.ats.entity.JobStatus;
import com.clarksprojects.ats.entity.PipelineStage;import com.clarksprojects.ats.exception.ResourceNotFoundException;import com.clarksprojects.ats.repository.CandidateRepository;
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
class CandidateServiceTest {

    @Mock
    private CandidateRepository candidateRepository;

    @Mock
    private JobService jobService;

    @InjectMocks
    private CandidateService candidateService;

    private Job sampleJob;
    private Candidate sampleCandidate;

    @BeforeEach
    void setUp() {
        sampleJob = Job.builder()
                .id(1L)
                .title("Software Engineer")
                .department("Engineering")
                .location("Remote")
                .status(JobStatus.OPEN)
                .employmentType(EmploymentType.FULL_TIME)
                .candidates(new ArrayList<>())
                .build();

        sampleCandidate = Candidate.builder()
                .id(10L)
                .firstName("Alice")
                .lastName("Smith")
                .email("alice@example.com")
                .phone("555-0111")
                .stage(PipelineStage.APPLIED)
                .stageOrder(0)
                .job(sampleJob)
                .build();
    }

    @Test
    void getCandidatesByJob_returnsOrderedList() {
        when(candidateRepository.findByJobIdOrderByStageOrderAsc(1L)).thenReturn(List.of(sampleCandidate));

        List<CandidateResponse> result = candidateService.getCandidatesByJob(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getFirstName()).isEqualTo("Alice");
        assertThat(result.get(0).getJobId()).isEqualTo(1L);
        assertThat(result.get(0).getJobTitle()).isEqualTo("Software Engineer");
    }

    @Test
    void getCandidatesByJobAndStage_filtersCorrectly() {
        when(candidateRepository.findByJobIdAndStageOrderByStageOrderAsc(1L, PipelineStage.APPLIED))
                .thenReturn(List.of(sampleCandidate));

        List<CandidateResponse> result = candidateService.getCandidatesByJobAndStage(1L, PipelineStage.APPLIED);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStage()).isEqualTo(PipelineStage.APPLIED);
    }

    @Test
    void getCandidate_existingId_returnsResponse() {
        when(candidateRepository.findById(10L)).thenReturn(Optional.of(sampleCandidate));

        CandidateResponse result = candidateService.getCandidate(10L);

        assertThat(result.getId()).isEqualTo(10L);
        assertThat(result.getEmail()).isEqualTo("alice@example.com");
    }

    @Test
    void getCandidate_nonExistentId_throwsResourceNotFoundException() {
        when(candidateRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> candidateService.getCandidate(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Candidate not found: 99");
    }

    @Test
    void createCandidate_savesFromRequest() {
        CandidateRequest request = CandidateRequest.builder()
                .firstName("Bob")
                .lastName("Jones")
                .email("bob@example.com")
                .phone("555-0222")
                .stage(PipelineStage.APPLIED)
                .jobId(1L)
                .build();

        Candidate saved = Candidate.builder()
                .id(11L)
                .firstName("Bob")
                .lastName("Jones")
                .email("bob@example.com")
                .phone("555-0222")
                .stage(PipelineStage.APPLIED)
                .stageOrder(0)
                .job(sampleJob)
                .build();

        when(jobService.findJobOrThrow(1L)).thenReturn(sampleJob);
        when(candidateRepository.save(any(Candidate.class))).thenReturn(saved);

        CandidateResponse result = candidateService.createCandidate(request);

        assertThat(result.getId()).isEqualTo(11L);
        assertThat(result.getFirstName()).isEqualTo("Bob");
        assertThat(result.getJobId()).isEqualTo(1L);
        verify(candidateRepository).save(any(Candidate.class));
    }

    @Test
    void createCandidate_nonExistentJob_throwsIllegalArgumentException() {
        CandidateRequest request = CandidateRequest.builder()
                .firstName("Bob").lastName("Jones")
                .email("bob@example.com")
                .stage(PipelineStage.APPLIED)
                .jobId(99L)
                .build();

        when(jobService.findJobOrThrow(99L))
                .thenThrow(new ResourceNotFoundException("Job not found: 99"));

        assertThatThrownBy(() -> candidateService.createCandidate(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Job not found: 99");
        verify(candidateRepository, never()).save(any());
    }

    @Test
    void updateCandidate_updatesFieldsAndReturns() {
        CandidateRequest request = CandidateRequest.builder()
                .firstName("Alice")
                .lastName("Updated")
                .email("alice.updated@example.com")
                .phone("555-9999")
                .stage(PipelineStage.SCREENING)
                .jobId(1L)
                .build();

        when(candidateRepository.findById(10L)).thenReturn(Optional.of(sampleCandidate));
        when(candidateRepository.save(any(Candidate.class))).thenAnswer(inv -> inv.getArgument(0));

        CandidateResponse result = candidateService.updateCandidate(10L, request);

        assertThat(result.getLastName()).isEqualTo("Updated");
        assertThat(result.getEmail()).isEqualTo("alice.updated@example.com");
        assertThat(result.getStage()).isEqualTo(PipelineStage.SCREENING);
    }

    @Test
    void updateCandidate_jobChange_assignsNewJob() {
        Job newJob = Job.builder()
                .id(2L).title("Product Designer")
                .department("Design").location("NY")
                .status(JobStatus.OPEN)
                .employmentType(EmploymentType.FULL_TIME)
                .candidates(new ArrayList<>())
                .build();

        CandidateRequest request = CandidateRequest.builder()
                .firstName("Alice").lastName("Smith")
                .email("alice@example.com")
                .stage(PipelineStage.APPLIED)
                .jobId(2L)
                .build();

        when(candidateRepository.findById(10L)).thenReturn(Optional.of(sampleCandidate));
        when(jobService.findJobOrThrow(2L)).thenReturn(newJob);
        when(candidateRepository.save(any(Candidate.class))).thenAnswer(inv -> inv.getArgument(0));

        CandidateResponse result = candidateService.updateCandidate(10L, request);

        assertThat(result.getJobId()).isEqualTo(2L);
        assertThat(result.getJobTitle()).isEqualTo("Product Designer");
    }

    @Test
    void moveStage_updatesStageAndOrder() {
        StageMoveRequest request = new StageMoveRequest(PipelineStage.INTERVIEW, 2);

        when(candidateRepository.findById(10L)).thenReturn(Optional.of(sampleCandidate));
        when(candidateRepository.save(any(Candidate.class))).thenAnswer(inv -> inv.getArgument(0));

        CandidateResponse result = candidateService.moveStage(10L, request);

        assertThat(result.getStage()).isEqualTo(PipelineStage.INTERVIEW);
        assertThat(result.getStageOrder()).isEqualTo(2);
    }

    @Test
    void moveStage_nullOrder_preservesExistingOrder() {
        StageMoveRequest request = new StageMoveRequest(PipelineStage.OFFER, null);

        when(candidateRepository.findById(10L)).thenReturn(Optional.of(sampleCandidate));
        when(candidateRepository.save(any(Candidate.class))).thenAnswer(inv -> inv.getArgument(0));

        CandidateResponse result = candidateService.moveStage(10L, request);

        assertThat(result.getStage()).isEqualTo(PipelineStage.OFFER);
        assertThat(result.getStageOrder()).isEqualTo(0); // original stageOrder unchanged
    }

    @Test
    void moveStage_nonExistentCandidate_throwsResourceNotFoundException() {
        when(candidateRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> candidateService.moveStage(99L, new StageMoveRequest(PipelineStage.HIRED, null)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Candidate not found: 99");
    }

    @Test
    void deleteCandidate_existingId_deletesCandidate() {
        when(candidateRepository.findById(10L)).thenReturn(Optional.of(sampleCandidate));

        candidateService.deleteCandidate(10L);

        verify(candidateRepository).delete(sampleCandidate);
    }

    @Test
    void deleteCandidate_nonExistentId_throwsResourceNotFoundException() {
        when(candidateRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> candidateService.deleteCandidate(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Candidate not found: 99");
        verify(candidateRepository, never()).delete(any());
    }
}
