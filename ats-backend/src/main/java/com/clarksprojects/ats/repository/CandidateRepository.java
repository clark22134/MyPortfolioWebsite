package com.clarksprojects.ats.repository;

import com.clarksprojects.ats.entity.Candidate;
import com.clarksprojects.ats.entity.PipelineStage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CandidateRepository extends JpaRepository<Candidate, Long> {
    List<Candidate> findByJobIdOrderByStageOrderAsc(Long jobId);
    List<Candidate> findByJobIdAndStageOrderByStageOrderAsc(Long jobId, PipelineStage stage);
    long countByStage(PipelineStage stage);
}
