package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.CandidateRequest;
import com.clarksprojects.ats.dto.CandidateResponse;
import com.clarksprojects.ats.dto.ParsedResume;
import com.clarksprojects.ats.dto.StageMoveRequest;
import com.clarksprojects.ats.entity.Candidate;
import com.clarksprojects.ats.entity.Job;
import com.clarksprojects.ats.entity.PipelineStage;
import com.clarksprojects.ats.repository.CandidateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class CandidateService {

    private final CandidateRepository candidateRepository;
    private final JobService jobService;

    @Transactional(readOnly = true)
    public List<CandidateResponse> searchCandidates(String name, String skills, PipelineStage stage, Long jobId) {
        String nameParam = (name == null || name.isBlank()) ? null : name.trim();
        List<Candidate> candidates = candidateRepository.search(nameParam, stage, jobId);
        if (skills == null || skills.isBlank()) {
            return candidates.stream().map(this::toResponse).toList();
        }
        return candidates.stream()
                .filter(c -> skillsMatch(c.getSkills(), skills))
                .map(this::toResponse)
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
    public CandidateResponse createFromParsedResume(ParsedResume parsed, String resumeUrl) {
        Job talentPoolJob = jobService.findOrCreateTalentPoolJob();
        Candidate candidate = Candidate.builder()
                .firstName(Objects.requireNonNullElse(parsed.firstName(), ""))
                .lastName(Objects.requireNonNullElse(parsed.lastName(), ""))
                .email(Objects.requireNonNullElse(parsed.email(), ""))
                .phone(parsed.phone())
                .resumeUrl(resumeUrl)
                .skills(parsed.skills())
                .stage(PipelineStage.APPLIED)
                .stageOrder(0)
                .job(talentPoolJob)
                .build();
        return toResponse(candidateRepository.save(candidate));
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
                .address(request.getAddress())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .lastAssignmentDays(request.getLastAssignmentDays())
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
        candidate.setAddress(request.getAddress());
        candidate.setLatitude(request.getLatitude());
        candidate.setLongitude(request.getLongitude());
        candidate.setLastAssignmentDays(request.getLastAssignmentDays());
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
        boolean isTalentPool = JobService.TALENT_POOL_EMPLOYER.equals(c.getJob().getEmployer())
                && JobService.TALENT_POOL_TITLE.equals(c.getJob().getTitle());
        return CandidateResponse.builder()
                .id(c.getId())
                .firstName(c.getFirstName())
                .lastName(c.getLastName())
                .email(c.getEmail())
                .phone(c.getPhone())
                .resumeUrl(c.getResumeUrl())
                .notes(c.getNotes())
                .skills(c.getSkills())
                .address(c.getAddress())
                .latitude(c.getLatitude())
                .longitude(c.getLongitude())
                .lastAssignmentDays(c.getLastAssignmentDays())
                .stage(c.getStage())
                .stageOrder(c.getStageOrder())
                .jobId(c.getJob().getId())
                .jobTitle(isTalentPool ? "Talent Pool" : c.getJob().getTitle())
                .talentPool(isTalentPool)
                .appliedAt(c.getAppliedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
