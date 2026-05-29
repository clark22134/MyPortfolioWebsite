package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.CandidateRequest;
import com.clarksprojects.ats.dto.CandidateResponse;
import com.clarksprojects.ats.dto.ParsedResume;
import com.clarksprojects.ats.dto.StageMoveRequest;
import com.clarksprojects.ats.dto.TagResponse;
import com.clarksprojects.ats.entity.ActivityType;
import com.clarksprojects.ats.entity.Candidate;
import com.clarksprojects.ats.entity.Job;
import com.clarksprojects.ats.entity.PipelineStage;
import com.clarksprojects.ats.exception.ResourceNotFoundException;
import com.clarksprojects.ats.repository.CandidateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class CandidateService {

    private final CandidateRepository candidateRepository;
    private final JobService jobService;
    private final ActivityService activityService;

    @Transactional(readOnly = true)
    public List<CandidateResponse> searchCandidates(String name, String skills, PipelineStage stage, Long jobId, String sort) {
        String nameParam = (name == null || name.isBlank()) ? null : name.trim();
        String stageParam = stage != null ? stage.name() : null;
        List<Candidate> candidates = candidateRepository.search(nameParam, stageParam, jobId);
        if (skills != null && !skills.isBlank()) {
            candidates = candidates.stream()
                    .filter(c -> skillsMatch(c.getSkills(), skills))
                    .toList();
        }
        return sorted(candidates, sort).stream().map(this::toResponse).toList();
    }

    /**
     * Sort options:
     *   "name"       (default) — last name then first name, ascending
     *   "applied"    — applied date, descending
     *   "applied:asc"— applied date, ascending
     *   "updated"    — last updated, descending
     */
    private List<Candidate> sorted(List<Candidate> candidates, String sort) {
        String key = sort == null ? "name" : sort.toLowerCase();
        Comparator<Candidate> comparator = switch (key) {
            case "applied", "applied:desc" -> Comparator.comparing(Candidate::getAppliedAt,
                    Comparator.nullsLast(Comparator.reverseOrder()));
            case "applied:asc" -> Comparator.comparing(Candidate::getAppliedAt,
                    Comparator.nullsLast(Comparator.naturalOrder()));
            case "updated", "updated:desc" -> Comparator.comparing(Candidate::getUpdatedAt,
                    Comparator.nullsLast(Comparator.reverseOrder()));
            default -> Comparator.comparing(Candidate::getLastName, String.CASE_INSENSITIVE_ORDER)
                    .thenComparing(Candidate::getFirstName, String.CASE_INSENSITIVE_ORDER);
        };
        return candidates.stream().sorted(comparator).toList();
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
        Candidate saved = candidateRepository.save(candidate);
        log.info("Candidate created from parsed resume: id={}, email={}", saved.getId(), saved.getEmail());
        activityService.record(ActivityType.RESUME_UPLOADED, saved, talentPoolJob,
                "Uploaded resume into Talent Pool",
                Map.of("email", Objects.requireNonNullElse(saved.getEmail(), ""),
                        "skills", Objects.requireNonNullElse(saved.getSkills(), "")));
        return toResponse(saved);
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
        Candidate saved = candidateRepository.save(candidate);
        log.info("Candidate created: id={}, email={}", saved.getId(), saved.getEmail());
        activityService.record(ActivityType.CANDIDATE_CREATED, saved, job,
                "Added candidate %s %s".formatted(saved.getFirstName(), saved.getLastName()),
                Map.of("email", Objects.requireNonNullElse(saved.getEmail(), ""),
                        "stage", saved.getStage().name()));
        return toResponse(saved);
    }

    @Transactional
    public CandidateResponse updateCandidate(Long id, CandidateRequest request) {
        Candidate candidate = findCandidateOrThrow(id);
        PipelineStage previousStage = candidate.getStage();
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
        Candidate saved = candidateRepository.save(candidate);
        log.info("Candidate updated: id={}", id);

        if (previousStage != saved.getStage()) {
            activityService.record(ActivityType.STAGE_CHANGED, saved, saved.getJob(),
                    "Moved from %s to %s".formatted(previousStage, saved.getStage()),
                    Map.of("from", previousStage.name(), "to", saved.getStage().name()));
        } else {
            activityService.record(ActivityType.CANDIDATE_UPDATED, saved, saved.getJob(),
                    "Updated candidate profile",
                    Map.of("candidateId", String.valueOf(saved.getId())));
        }
        return toResponse(saved);
    }

    @Transactional
    public CandidateResponse moveStage(Long id, StageMoveRequest request) {
        Candidate candidate = findCandidateOrThrow(id);
        PipelineStage previous = candidate.getStage();
        candidate.setStage(request.getNewStage());
        if (request.getNewOrder() != null) {
            candidate.setStageOrder(request.getNewOrder());
        }
        Candidate saved = candidateRepository.save(candidate);
        log.info("Candidate stage moved: id={}, newStage={}", id, request.getNewStage());
        if (previous != saved.getStage()) {
            activityService.record(ActivityType.STAGE_CHANGED, saved, saved.getJob(),
                    "Moved from %s to %s".formatted(previous, saved.getStage()),
                    Map.of("from", previous.name(), "to", saved.getStage().name()));
        }
        return toResponse(saved);
    }

    @Transactional
    public void deleteCandidate(Long id) {
        Candidate candidate = findCandidateOrThrow(id);
        activityService.record(ActivityType.CANDIDATE_DELETED, null, candidate.getJob(),
                "Deleted candidate %s %s".formatted(candidate.getFirstName(), candidate.getLastName()),
                Map.of("candidateId", String.valueOf(candidate.getId())));
        candidateRepository.delete(candidate);
        log.info("Candidate deleted: id={}", id);
    }

    private Candidate findCandidateOrThrow(Long id) {
        return candidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found: " + id));
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
                .tags(c.getTags() == null ? List.of()
                        : c.getTags().stream()
                            .sorted(Comparator.comparing(t -> t.getName().toLowerCase()))
                            .map(TagResponse::from)
                            .toList())
                .appliedAt(c.getAppliedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
