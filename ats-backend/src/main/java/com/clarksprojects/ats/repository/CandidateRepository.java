package com.clarksprojects.ats.repository;

import com.clarksprojects.ats.entity.Candidate;
import com.clarksprojects.ats.entity.PipelineStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CandidateRepository extends JpaRepository<Candidate, Long> {
    List<Candidate> findByJobIdOrderByStageOrderAsc(Long jobId);
    List<Candidate> findByJobIdAndStageOrderByStageOrderAsc(Long jobId, PipelineStage stage);
    long countByStage(PipelineStage stage);

    @Query(value = "SELECT * FROM candidate c WHERE " +
           "(CAST(:name AS text) IS NULL OR LOWER(c.first_name || ' ' || c.last_name) LIKE LOWER('%' || CAST(:name AS text) || '%')) AND " +
           "(CAST(:stage AS varchar) IS NULL OR c.stage = CAST(:stage AS varchar)) AND " +
           "(CAST(:jobId AS bigint) IS NULL OR c.job_id = CAST(:jobId AS bigint)) " +
           "ORDER BY c.last_name ASC, c.first_name ASC", nativeQuery = true)
    List<Candidate> search(@Param("name") String name,
                           @Param("stage") String stage,
                           @Param("jobId") Long jobId);
}
