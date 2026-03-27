package com.clarksprojects.ats.repository;

import com.clarksprojects.ats.entity.Job;
import com.clarksprojects.ats.entity.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JobRepository extends JpaRepository<Job, Long> {
    List<Job> findByStatusOrderByCreatedAtDesc(JobStatus status);
    List<Job> findByEmployerIgnoreCaseOrderByCreatedAtDesc(String employer);
    long countByStatus(JobStatus status);
}
