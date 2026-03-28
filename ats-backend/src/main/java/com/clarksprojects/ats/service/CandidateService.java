package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.CandidateRequest;
import com.clarksprojects.ats.dto.CandidateResponse;
import com.clarksprojects.ats.dto.StageMoveRequest;
import com.clarksprojects.ats.entity.Candidate;
import com.clarksprojects.ats.entity.Job;
import com.clarksprojects.ats.entity.PipelineStage;
import com.clarksprojects.ats.repository.CandidateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CandidateService {

    private final CandidateRepository candidateRepository;
    private final JobService jobService;

    @Transactional(readOnly = true)
    public List<CandidateResponse> searchCandidates(String name, String skills, PipelineStage stage, Long jobId) {
        return candidateRepository.findAll().stream()
                .filter(c -> name == null || name.isBlank() ||
                        (c.getFirstName() + " " + c.getLastName()).toLowerCase().contains(name.toLowerCase().trim()))
                .filter(c -> stage == null || c.getStage() == stage)
                .filter(c -> jobId == null || c.getJob().getId().equals(jobId))
                .filter(c -> skills == null || skills.isBlank() || skillsMatch(c.getSkills(), skills))
                .map(this::toResponse)
                .sorted(Comparator.comparing(CandidateResponse::getLastName)
                        .thenComparing(CandidateResponse::getFirstName))
                .toList();
    }

    private boolean skillsMatch(String candidateSkills, String searchSkills) {
        if (candidateSkills == null || candidateSkills.isBlank()) return false;
        List<String> cSkills = Arrays.stream(candidateSkills.split(","))
                .map(s -> s.trim().toLowerCase()).toList();
        return Arrays.stream(searchSkills.split(","))
                .map(s -> s.trim().toLowerCase())
                .filter(s -> !s.isEmpty())
                .anyMatch(cSkills::contains);
    }

    @Transactional(readOnly = true)
    public List<CandidateResponse> getCandidatesByJob(Long jobId) {
        return candidateRepository.findByJobIdOrderByStageOrderAsc(jobId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CandidateResponse> getCandidatesByJobAndStage(Long jobId, PipelineStage stage) {
        return candidateRepository.findByJobIdAndStageOrderByStageOrderAsc(jobId, stage).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CandidateResponse getCandidate(Long id) {
        return toResponse(findCandidateOrThrow(id));
    }

    @Transactional
    public CandidateResponse createCandidate(CandidateRequest request) {
        Job job = jobService.findJobOrThrow(request.getJobId());
        Candidate candidate = Candidate.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .resumeUrl(request.getResumeUrl())
                .notes(request.getNotes())
                .skills(request.getSkills())
                .stage(request.getStage())
                .stageOrder(0)
                .job(job)
                .build();
        return toResponse(candidateRepository.save(candidate));
    }

    @Transactional
    public CandidateResponse updateCandidate(Long id, CandidateRequest request) {
        Candidate candidate = findCandidateOrThrow(id);
        candidate.setFirstName(request.getFirstName());
        candidate.setLastName(request.getLastName());
        candidate.setEmail(request.getEmail());
        candidate.setPhone(request.getPhone());
        candidate.setResumeUrl(request.getResumeUrl());
        candidate.setNotes(request.getNotes());
        candidate.setSkills(request.getSkills());
        candidate.setStage(request.getStage());
        if (request.getJobId() != null && !request.getJobId().equals(candidate.getJob().getId())) {
            Job newJob = jobService.findJobOrThrow(request.getJobId());
            candidate.setJob(newJob);
        }
        return toResponse(candidateRepository.save(candidate));
    }

    @Transactional
    public CandidateResponse moveStage(Long id, StageMoveRequest request) {
        Candidate candidate = findCandidateOrThrow(id);
        candidate.setStage(request.getNewStage());
        if (request.getNewOrder() != null) {
            candidate.setStageOrder(request.getNewOrder());
        }
        return toResponse(candidateRepository.save(candidate));
    }

    @Transactional
    public void deleteCandidate(Long id) {
        Candidate candidate = findCandidateOrThrow(id);
        candidateRepository.delete(candidate);
    }

    private Candidate findCandidateOrThrow(Long id) {
        return candidateRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found: " + id));
    }

    private CandidateResponse toResponse(Candidate c) {
        return CandidateResponse.builder()
                .id(c.getId())
                .firstName(c.getFirstName())
                .lastName(c.getLastName())
                .email(c.getEmail())
                .phone(c.getPhone())
                .resumeUrl(c.getResumeUrl())
                .notes(c.getNotes())
                .skills(c.getSkills())
                .stage(c.getStage())
                .stageOrder(c.getStageOrder())
                .jobId(c.getJob().getId())
                .jobTitle(c.getJob().getTitle())
                .appliedAt(c.getAppliedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
