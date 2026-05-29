package com.clarksprojects.ats.repository;

import com.clarksprojects.ats.entity.CandidateNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CandidateNoteRepository extends JpaRepository<CandidateNote, Long> {
    List<CandidateNote> findByCandidateIdOrderByCreatedAtDesc(Long candidateId);
    long countByCandidateId(Long candidateId);
}
