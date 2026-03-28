package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.JobRequest;
import com.clarksprojects.ats.dto.JobResponse;
import com.clarksprojects.ats.dto.TopCandidateMatch;
import com.clarksprojects.ats.entity.Candidate;
import com.clarksprojects.ats.entity.Job;
import com.clarksprojects.ats.entity.JobStatus;
import com.clarksprojects.ats.repository.CandidateRepository;
import com.clarksprojects.ats.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JobService {

    private final JobRepository jobRepository;
    private final CandidateRepository candidateRepository;

    @Transactional(readOnly = true)
    public List<JobResponse> getAllJobs() {
        return jobRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<JobResponse> getJobsByStatus(JobStatus status) {
        return jobRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<JobResponse> getJobsByEmployer(String employer) {
        return jobRepository.findByEmployerIgnoreCaseOrderByCreatedAtDesc(employer).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public JobResponse getJob(Long id) {
        return toResponse(findJobOrThrow(id));
    }

    @Transactional
    public JobResponse createJob(JobRequest request) {
        Job job = Job.builder()
                .employer(request.getEmployer())
                .title(request.getTitle())
                .department(request.getDepartment())
                .location(request.getLocation())
                .description(request.getDescription())
                .requiredSkills(request.getRequiredSkills())
                .status(request.getStatus())
                .employmentType(request.getEmploymentType())
                .build();
        return toResponse(jobRepository.save(job));
    }

    @Transactional
    public JobResponse updateJob(Long id, JobRequest request) {
        Job job = findJobOrThrow(id);
        job.setEmployer(request.getEmployer());
        job.setTitle(request.getTitle());
        job.setDepartment(request.getDepartment());
        job.setLocation(request.getLocation());
        job.setDescription(request.getDescription());
        job.setRequiredSkills(request.getRequiredSkills());
        job.setStatus(request.getStatus());
        job.setEmploymentType(request.getEmploymentType());
        return toResponse(jobRepository.save(job));
    }

    @Transactional
    public void deleteJob(Long id) {
        Job job = findJobOrThrow(id);
        jobRepository.delete(job);
    }

    @Transactional(readOnly = true)
    public List<TopCandidateMatch> getTopCandidates(Long jobId) {
        Job job = findJobOrThrow(jobId);
        List<String> required = parseSkills(job.getRequiredSkills());
        if (required.isEmpty()) return List.of();

        List<Candidate> all = candidateRepository.findAll();
        return all.stream()
                .map(c -> {
                    List<String> cSkills = parseSkills(c.getSkills());
                    List<String> matched = required.stream()
                            .filter(s -> cSkills.stream().anyMatch(cs -> cs.equalsIgnoreCase(s)))
                            .toList();
                    int pct = (int) Math.round((double) matched.size() / required.size() * 100);
                    return TopCandidateMatch.builder()
                            .candidateId(c.getId())
                            .firstName(c.getFirstName())
                            .lastName(c.getLastName())
                            .email(c.getEmail())
                            .matchPercent(pct)
                            .matchedSkills(matched)
                            .candidateSkills(cSkills)
                            .build();
                })
                .filter(m -> m.getMatchPercent() > 0)
                .sorted(Comparator.comparingInt(TopCandidateMatch::getMatchPercent).reversed())
                .limit(5)
                .toList();
    }

    private List<String> parseSkills(String skills) {
        if (skills == null || skills.isBlank()) return List.of();
        return Arrays.stream(skills.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    Job findJobOrThrow(Long id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Job not found: " + id));
    }

    private JobResponse toResponse(Job job) {
        return JobResponse.builder()
                .id(job.getId())
                .employer(job.getEmployer())
                .title(job.getTitle())
                .department(job.getDepartment())
                .location(job.getLocation())
                .description(job.getDescription())
                .requiredSkills(job.getRequiredSkills())
                .status(job.getStatus())
                .employmentType(job.getEmploymentType())
                .candidateCount(job.getCandidates().size())
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .build();
    }
}
