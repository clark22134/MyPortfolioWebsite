package com.clarksprojects.ats.controller;

import com.clarksprojects.ats.dto.ActivityResponse;
import com.clarksprojects.ats.service.ActivityService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/activities")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;

    @GetMapping
    public List<ActivityResponse> list(
            @RequestParam(required = false) Long candidateId,
            @RequestParam(required = false) Long jobId,
            @RequestParam(defaultValue = "20") int limit) {
        if (candidateId != null) return activityService.forCandidate(candidateId);
        if (jobId != null) return activityService.forJob(jobId);
        return activityService.recent(limit);
    }
}
