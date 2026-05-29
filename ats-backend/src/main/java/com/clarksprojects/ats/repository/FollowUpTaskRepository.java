package com.clarksprojects.ats.repository;

import com.clarksprojects.ats.entity.FollowUpTask;
import com.clarksprojects.ats.entity.TaskStatus;
import com.clarksprojects.ats.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface FollowUpTaskRepository extends JpaRepository<FollowUpTask, Long> {

    List<FollowUpTask> findByOrderByDueAtAscCreatedAtDesc();
    List<FollowUpTask> findByStatusOrderByDueAtAscCreatedAtDesc(TaskStatus status);
    List<FollowUpTask> findByAssigneeOrderByDueAtAscCreatedAtDesc(User assignee);
    List<FollowUpTask> findByCandidateIdOrderByDueAtAscCreatedAtDesc(Long candidateId);

    long countByStatus(TaskStatus status);
    long countByStatusAndDueAtBefore(TaskStatus status, LocalDateTime cutoff);

    List<FollowUpTask> findTop5ByStatusOrderByDueAtAscCreatedAtAsc(TaskStatus status);
    List<FollowUpTask> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
