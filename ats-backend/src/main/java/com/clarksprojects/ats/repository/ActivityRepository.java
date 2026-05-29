package com.clarksprojects.ats.repository;

import com.clarksprojects.ats.entity.Activity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ActivityRepository extends JpaRepository<Activity, Long> {
    List<Activity> findByCandidateIdOrderByCreatedAtDesc(Long candidateId);
    List<Activity> findByJobIdOrderByCreatedAtDesc(Long jobId);
    List<Activity> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
