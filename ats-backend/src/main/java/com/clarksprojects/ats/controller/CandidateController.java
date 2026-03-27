package com.clarksprojects.ats.controller;

import com.clarksprojects.ats.dto.CandidateRequest;
import com.clarksprojects.ats.dto.CandidateResponse;
import com.clarksprojects.ats.dto.StageMoveRequest;
import com.clarksprojects.ats.entity.PipelineStage;
import com.clarksprojects.ats.service.CandidateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/candidates")
@RequiredArgsConstructor
public class CandidateController {

    private final CandidateService candidateService;

    @GetMapping
    public List<CandidateResponse> getCandidates(
            @RequestParam Long jobId,
            @RequestParam(required = false) PipelineStage stage) {
        if (stage != null) {
            return candidateService.getCandidatesByJobAndStage(jobId, stage);
        }
        return candidateService.getCandidatesByJob(jobId);
    }

    @GetMapping("/{id}")
    public CandidateResponse getCandidate(@PathVariable Long id) {
        return candidateService.getCandidate(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CandidateResponse createCandidate(@Valid @RequestBody CandidateRequest request) {
        return candidateService.createCandidate(request);
    }

    @PutMapping("/{id}")
    public CandidateResponse updateCandidate(@PathVariable Long id, @Valid @RequestBody CandidateRequest request) {
        return candidateService.updateCandidate(id, request);
    }

    @PatchMapping("/{id}/stage")
    public CandidateResponse moveStage(@PathVariable Long id, @Valid @RequestBody StageMoveRequest request) {
        return candidateService.moveStage(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCandidate(@PathVariable Long id) {
        candidateService.deleteCandidate(id);
    }
}
