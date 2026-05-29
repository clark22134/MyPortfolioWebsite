package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.ActivityResponse;
import com.clarksprojects.ats.entity.*;
import com.clarksprojects.ats.repository.ActivityRepository;
import com.clarksprojects.ats.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Append-only audit log. Other services call into {@link #record} after they
 * mutate state, so the timeline reflects business actions rather than database
 * triggers.
 */
@Service
@RequiredArgsConstructor
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final CurrentUserService currentUserService;

    @Transactional
    public Activity record(ActivityType type, Candidate candidate, Job job, String summary, Map<String, String> metadata) {
        Activity activity = Activity.builder()
                .type(type)
                .candidate(candidate)
                .job(job)
                .actor(currentUserService.currentUser().orElse(null))
                .summary(summary)
                .metadata(serialize(metadata))
                .build();
        return activityRepository.save(activity);
    }

    @Transactional(readOnly = true)
    public List<ActivityResponse> forCandidate(Long candidateId) {
        return activityRepository.findByCandidateIdOrderByCreatedAtDesc(candidateId).stream()
                .map(ActivityResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ActivityResponse> forJob(Long jobId) {
        return activityRepository.findByJobIdOrderByCreatedAtDesc(jobId).stream()
                .map(ActivityResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ActivityResponse> recent(int limit) {
        return activityRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, Math.max(1, limit))).stream()
                .map(ActivityResponse::from)
                .toList();
    }

    private String serialize(Map<String, String> meta) {
        if (meta == null || meta.isEmpty()) return null;
        return meta.entrySet().stream()
                .map(e -> e.getKey() + "=" + (e.getValue() == null ? "" : e.getValue()))
                .collect(Collectors.joining(";"));
    }
}
