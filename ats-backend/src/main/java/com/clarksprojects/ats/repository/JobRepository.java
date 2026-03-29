package com.clarksprojects.ats.repository;

import com.clarksprojects.ats.entity.Job;
import com.clarksprojects.ats.entity.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface JobRepository extends JpaRepository<Job, Long> {
    List<Job> findByStatusOrderByCreatedAtDesc(JobStatus status);
    List<Job> findByEmployerIgnoreCaseOrderByCreatedAtDesc(String employer);
    long countByStatus(JobStatus status);
    Optional<Job> findByEmployerAndTitle(String employer, String title);

    long countByEmployerNot(String employer);

    @Query("SELECT j.employer, COUNT(j) FROM Job j " +
           "WHERE j.employer IS NOT NULL AND j.employer <> '' AND j.employer <> :excludedEmployer " +
           "GROUP BY j.employer")
    List<Object[]> countJobsGroupedByEmployer(@Param("excludedEmployer") String excludedEmployer);
}
