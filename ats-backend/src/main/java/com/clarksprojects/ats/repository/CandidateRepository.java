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

    @Query("SELECT c FROM Candidate c WHERE " +
           "(:name IS NULL OR LOWER(CONCAT(c.firstName, ' ', c.lastName)) LIKE LOWER(CONCAT('%', :name, '%'))) AND " +
           "(:stage IS NULL OR c.stage = :stage) AND " +
           "(:jobId IS NULL OR c.job.id = :jobId) " +
           "ORDER BY c.lastName ASC, c.firstName ASC")
    List<Candidate> search(@Param("name") String name,
                           @Param("stage") PipelineStage stage,
                           @Param("jobId") Long jobId);
}
