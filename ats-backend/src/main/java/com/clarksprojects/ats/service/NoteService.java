package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.NoteRequest;
import com.clarksprojects.ats.dto.NoteResponse;
import com.clarksprojects.ats.entity.ActivityType;
import com.clarksprojects.ats.entity.Candidate;
import com.clarksprojects.ats.entity.CandidateNote;
import com.clarksprojects.ats.entity.User;
import com.clarksprojects.ats.exception.ResourceNotFoundException;
import com.clarksprojects.ats.repository.CandidateNoteRepository;
import com.clarksprojects.ats.repository.CandidateRepository;
import com.clarksprojects.ats.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NoteService {

    private final CandidateNoteRepository noteRepository;
    private final CandidateRepository candidateRepository;
    private final ActivityService activityService;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public List<NoteResponse> listForCandidate(Long candidateId) {
        return noteRepository.findByCandidateIdOrderByCreatedAtDesc(candidateId).stream()
                .map(NoteResponse::from)
                .toList();
    }

    @Transactional
    public NoteResponse create(NoteRequest request) {
        Candidate candidate = candidateRepository.findById(request.getCandidateId())
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found: " + request.getCandidateId()));
        User author = currentUserService.currentUser().orElse(null);
        CandidateNote note = noteRepository.save(CandidateNote.builder()
                .candidate(candidate)
                .author(author)
                .body(request.getBody())
                .build());

        activityService.record(
                ActivityType.NOTE_ADDED,
                candidate,
                candidate.getJob(),
                "Added a note",
                Map.of("noteId", String.valueOf(note.getId()),
                        "preview", note.getBody().length() > 80
                                ? note.getBody().substring(0, 80) + "…" : note.getBody())
        );
        return NoteResponse.from(note);
    }

    @Transactional
    public void delete(Long noteId) {
        CandidateNote note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Note not found: " + noteId));
        noteRepository.delete(note);
    }
}
