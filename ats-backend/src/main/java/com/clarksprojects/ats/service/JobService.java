package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.JobRequest;
import com.clarksprojects.ats.dto.JobResponse;
import com.clarksprojects.ats.dto.TopCandidateMatch;
import com.clarksprojects.ats.entity.Candidate;
import com.clarksprojects.ats.entity.EmploymentType;
import com.clarksprojects.ats.entity.Job;
import com.clarksprojects.ats.entity.JobStatus;
import com.clarksprojects.ats.exception.ResourceNotFoundException;
import com.clarksprojects.ats.repository.CandidateRepository;
import com.clarksprojects.ats.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class JobService {

    static final String TALENT_POOL_EMPLOYER = "SYSTEM";
    static final String TALENT_POOL_TITLE = "Talent Pool";

    private final JobRepository jobRepository;
    private final CandidateRepository candidateRepository;

    @Transactional(readOnly = true)
    public List<JobResponse> getAllJobs() {
        return jobRepository.findAll().stream()
                .filter(j -> !isTalentPoolJob(j))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<JobResponse> getJobsByStatus(JobStatus status) {
        return jobRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .filter(j -> !isTalentPoolJob(j))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public Job findOrCreateTalentPoolJob() {
        return jobRepository.findByEmployerAndTitle(TALENT_POOL_EMPLOYER, TALENT_POOL_TITLE)
                .orElseGet(() -> jobRepository.save(Job.builder()
                        .employer(TALENT_POOL_EMPLOYER)
                        .title(TALENT_POOL_TITLE)
                        .department("Talent Pool")
                        .location("N/A")
                        .status(JobStatus.ON_HOLD)
                        .employmentType(EmploymentType.FULL_TIME)
                        .build()));
    }

    private boolean isTalentPoolJob(Job job) {
        return TALENT_POOL_EMPLOYER.equals(job.getEmployer())
                && TALENT_POOL_TITLE.equals(job.getTitle());
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
                .address(request.getAddress())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .status(request.getStatus())
                .employmentType(request.getEmploymentType())
                .build();
        JobResponse response = toResponse(jobRepository.save(job));
        log.info("Job created: id={}, title={}", response.getId(), response.getTitle());
        return response;
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
        job.setAddress(request.getAddress());
        job.setLatitude(request.getLatitude());
        job.setLongitude(request.getLongitude());
        job.setStatus(request.getStatus());
        job.setEmploymentType(request.getEmploymentType());
        JobResponse response = toResponse(jobRepository.save(job));
        log.info("Job updated: id={}", id);
        return response;
    }

    @Transactional
    public void deleteJob(Long id) {
        Job job = findJobOrThrow(id);
        jobRepository.delete(job);
        log.info("Job deleted: id={}", id);
    }

    private static final int MAX_DAYS = 730;
    private static final double MAX_DISTANCE_MILES = 50.0;

    @Transactional(readOnly = true)
    public List<TopCandidateMatch> getTopCandidates(Long jobId) {
        Job job = findJobOrThrow(jobId);
        List<String> required = parseSkills(job.getRequiredSkills());
        if (required.isEmpty()) return List.of();

        record Scored(TopCandidateMatch match, double composite) {}

        List<Candidate> all = candidateRepository.findAll();
        return all.stream()
                .map(c -> {
                    List<String> cSkills = parseSkills(c.getSkills());
                    List<String> matched = required.stream()
                            .filter(s -> cSkills.stream().anyMatch(cs -> cs.equalsIgnoreCase(s)))
                            .toList();
                    int skillsPct = (int) Math.round((double) matched.size() / required.size() * 100);

                    int days = c.getLastAssignmentDays() != null ? c.getLastAssignmentDays() : 0;
                    double daysNorm = Math.min(days, MAX_DAYS) / (double) MAX_DAYS * 100.0;

                    double distMiles = -1.0;
                    double distNorm = 50.0;
                    if (job.getLatitude() != null && job.getLongitude() != null
                            && c.getLatitude() != null && c.getLongitude() != null) {
                        distMiles = haversineDistanceMiles(
                                job.getLatitude(), job.getLongitude(),
                                c.getLatitude(), c.getLongitude());
                        distNorm = Math.max(0.0, 100.0 - (distMiles / MAX_DISTANCE_MILES) * 100.0);
                    }

                    double composite = 0.5 * skillsPct + 0.25 * daysNorm + 0.25 * distNorm;
                    TopCandidateMatch match = new TopCandidateMatch(
                            c.getId(),
                            c.getFirstName(),
                            c.getLastName(),
                            c.getEmail(),
                            skillsPct,
                            days,
                            distMiles,
                            matched,
                            cSkills
                    );
                    return new Scored(match, composite);
                })
                .filter(s -> s.match().skillsMatchPercent() > 0)
                .sorted(Comparator.comparingDouble(Scored::composite).reversed())
                .limit(5)
                .map(Scored::match)
                .toList();
    }

    private double haversineDistanceMiles(double lat1, double lon1, double lat2, double lon2) {
        final double R = 3958.8;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + id));
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
                .address(job.getAddress())
                .latitude(job.getLatitude())
                .longitude(job.getLongitude())
                .status(job.getStatus())
                .employmentType(job.getEmploymentType())
                .candidateCount(job.getCandidates().size())
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .build();
    }
}
