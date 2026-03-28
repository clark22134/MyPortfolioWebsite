package com.clarksprojects.ats.controller;

import com.clarksprojects.ats.dto.JobRequest;
import com.clarksprojects.ats.dto.JobResponse;
import com.clarksprojects.ats.dto.TopCandidateMatch;
import com.clarksprojects.ats.entity.JobStatus;
import com.clarksprojects.ats.service.JobService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;

    @GetMapping
    public List<JobResponse> getAllJobs(
            @RequestParam(required = false) JobStatus status,
            @RequestParam(required = false) String employer) {
        if (status != null) {
            return jobService.getJobsByStatus(status);
        }
        if (employer != null && !employer.isBlank()) {
            return jobService.getJobsByEmployer(employer);
        }
        return jobService.getAllJobs();
    }

    @GetMapping("/{id}")
    public JobResponse getJob(@PathVariable Long id) {
        return jobService.getJob(id);
    }

    @GetMapping("/{id}/top-candidates")
    public List<TopCandidateMatch> getTopCandidates(@PathVariable Long id) {
        return jobService.getTopCandidates(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public JobResponse createJob(@Valid @RequestBody JobRequest request) {
        return jobService.createJob(request);
    }

    @PutMapping("/{id}")
    public JobResponse updateJob(@PathVariable Long id, @Valid @RequestBody JobRequest request) {
        return jobService.updateJob(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteJob(@PathVariable Long id) {
        jobService.deleteJob(id);
    }
}
