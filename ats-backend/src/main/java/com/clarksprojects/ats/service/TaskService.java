package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.TaskRequest;
import com.clarksprojects.ats.dto.TaskResponse;
import com.clarksprojects.ats.entity.*;
import com.clarksprojects.ats.repository.CandidateRepository;
import com.clarksprojects.ats.repository.FollowUpTaskRepository;
import com.clarksprojects.ats.repository.JobRepository;
import com.clarksprojects.ats.repository.UserRepository;
import com.clarksprojects.ats.security.CurrentUserService;
import com.clarksprojects.ats.util.Entities;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final FollowUpTaskRepository taskRepository;
    private final CandidateRepository candidateRepository;
    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final ActivityService activityService;

    @Transactional(readOnly = true)
    public List<TaskResponse> listAll(TaskStatus status, Long assigneeId, Long candidateId) {
        if (candidateId != null) {
            return taskRepository.findByCandidateIdOrderByDueAtAscCreatedAtDesc(candidateId).stream()
                    .map(TaskResponse::from).toList();
        }
        if (assigneeId != null) {
            User assignee = Entities.findOrThrow(userRepository, assigneeId, "User");
            return taskRepository.findByAssigneeOrderByDueAtAscCreatedAtDesc(assignee).stream()
                    .map(TaskResponse::from).toList();
        }
        if (status != null) {
            return taskRepository.findByStatusOrderByDueAtAscCreatedAtDesc(status).stream()
                    .map(TaskResponse::from).toList();
        }
        return taskRepository.findByOrderByDueAtAscCreatedAtDesc().stream()
                .map(TaskResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> myTasks() {
        return currentUserService.currentUser()
                .map(u -> taskRepository.findByAssigneeOrderByDueAtAscCreatedAtDesc(u).stream()
                        .map(TaskResponse::from).toList())
                .orElseGet(List::of);
    }

    @Transactional(readOnly = true)
    public TaskResponse get(Long id) {
        return TaskResponse.from(findOrThrow(id));
    }

    @Transactional
    public TaskResponse create(TaskRequest request) {
        FollowUpTask task = FollowUpTask.builder()
                .subject(request.getSubject())
                .description(request.getDescription())
                .candidate(resolveCandidate(request.getCandidateId()))
                .job(resolveJob(request.getJobId()))
                .assignee(resolveUser(request.getAssigneeId()))
                .creator(currentUserService.currentUser().orElse(null))
                .priority(request.getPriority() != null ? request.getPriority() : TaskPriority.NORMAL)
                .status(TaskStatus.OPEN)
                .dueAt(request.getDueAt())
                .build();
        FollowUpTask saved = taskRepository.save(task);

        activityService.record(
                ActivityType.TASK_CREATED,
                saved.getCandidate(),
                saved.getJob(),
                "Created task: " + saved.getSubject(),
                Map.of("taskId", String.valueOf(saved.getId()),
                        "dueAt", saved.getDueAt() == null ? "" : saved.getDueAt().toString())
        );
        return TaskResponse.from(saved);
    }

    @Transactional
    public TaskResponse update(Long id, TaskRequest request) {
        FollowUpTask task = findOrThrow(id);
        task.setSubject(request.getSubject());
        task.setDescription(request.getDescription());
        task.setCandidate(resolveCandidate(request.getCandidateId()));
        task.setJob(resolveJob(request.getJobId()));
        task.setAssignee(resolveUser(request.getAssigneeId()));
        if (request.getPriority() != null) task.setPriority(request.getPriority());
        task.setDueAt(request.getDueAt());
        return TaskResponse.from(taskRepository.save(task));
    }

    @Transactional
    public TaskResponse updateStatus(Long id, TaskStatus status) {
        FollowUpTask task = findOrThrow(id);
        task.setStatus(status);
        if (status == TaskStatus.DONE || status == TaskStatus.CANCELLED) {
            task.setCompletedAt(LocalDateTime.now());
        } else {
            task.setCompletedAt(null);
        }
        FollowUpTask saved = taskRepository.save(task);

        ActivityType type = status == TaskStatus.DONE ? ActivityType.TASK_COMPLETED
                : status == TaskStatus.CANCELLED ? ActivityType.TASK_CANCELLED
                : null;
        if (type != null) {
            activityService.record(type, saved.getCandidate(), saved.getJob(),
                    (status == TaskStatus.DONE ? "Completed" : "Cancelled") + " task: " + saved.getSubject(),
                    Map.of("taskId", String.valueOf(saved.getId())));
        }
        return TaskResponse.from(saved);
    }

    @Transactional
    public void delete(Long id) {
        FollowUpTask task = findOrThrow(id);
        taskRepository.delete(task);
    }

    private FollowUpTask findOrThrow(Long id) {
        return Entities.findOrThrow(taskRepository, id, "Task");
    }

    private Candidate resolveCandidate(Long id) {
        return id == null ? null : Entities.findOrThrow(candidateRepository, id, "Candidate");
    }

    private Job resolveJob(Long id) {
        return id == null ? null : Entities.findOrThrow(jobRepository, id, "Job");
    }

    private User resolveUser(Long id) {
        return id == null ? null : Entities.findOrThrow(userRepository, id, "User");
    }
}
