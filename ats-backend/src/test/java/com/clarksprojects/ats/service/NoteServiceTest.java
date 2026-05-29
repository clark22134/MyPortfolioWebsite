package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.NoteRequest;
import com.clarksprojects.ats.dto.NoteResponse;
import com.clarksprojects.ats.entity.*;
import com.clarksprojects.ats.exception.ResourceNotFoundException;
import com.clarksprojects.ats.repository.CandidateNoteRepository;
import com.clarksprojects.ats.repository.CandidateRepository;
import com.clarksprojects.ats.security.CurrentUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NoteServiceTest {

    @Mock CandidateNoteRepository noteRepository;
    @Mock CandidateRepository candidateRepository;
    @Mock ActivityService activityService;
    @Mock CurrentUserService currentUserService;

    @InjectMocks NoteService noteService;

    private Candidate candidate;
    private User author;

    @BeforeEach
    void setUp() {
        Job job = Job.builder().id(1L).employer("Acme").title("Eng").department("Eng")
                .location("Remote").status(JobStatus.OPEN).employmentType(EmploymentType.FULL_TIME).build();
        candidate = Candidate.builder().id(10L).firstName("Alice").lastName("Smith")
                .email("a@b.com").stage(PipelineStage.APPLIED).stageOrder(0).job(job).build();
        author = User.builder().id(1L).username("rec").password("x").email("r@x.com")
                .fullName("Recruiter").role(Role.RECRUITER).build();
    }

    @Test
    void listForCandidate_returnsResponses() {
        CandidateNote note = CandidateNote.builder().id(1L).candidate(candidate).author(author).body("Strong fit").build();
        when(noteRepository.findByCandidateIdOrderByCreatedAtDesc(10L)).thenReturn(List.of(note));

        List<NoteResponse> result = noteService.listForCandidate(10L);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).body()).isEqualTo("Strong fit");
        assertThat(result.get(0).authorName()).isEqualTo("Recruiter");
    }

    @Test
    void create_existingCandidate_savesAndLogsActivity() {
        NoteRequest req = NoteRequest.builder().candidateId(10L).body("Reaching out tomorrow").build();
        when(candidateRepository.findById(10L)).thenReturn(Optional.of(candidate));
        when(currentUserService.currentUser()).thenReturn(Optional.of(author));
        when(noteRepository.save(any(CandidateNote.class))).thenAnswer(inv -> {
            CandidateNote n = inv.getArgument(0);
            n.setId(99L);
            return n;
        });

        NoteResponse response = noteService.create(req);

        assertThat(response.id()).isEqualTo(99L);
        verify(activityService).record(eq(ActivityType.NOTE_ADDED), eq(candidate), eq(candidate.getJob()),
                anyString(), anyMap());
    }

    @Test
    void create_anonymousAuthor_savesWithNullAuthor() {
        NoteRequest req = NoteRequest.builder().candidateId(10L).body("anon").build();
        when(candidateRepository.findById(10L)).thenReturn(Optional.of(candidate));
        when(currentUserService.currentUser()).thenReturn(Optional.empty());
        when(noteRepository.save(any(CandidateNote.class))).thenAnswer(inv -> {
            CandidateNote n = inv.getArgument(0);
            n.setId(1L);
            return n;
        });

        NoteResponse response = noteService.create(req);
        assertThat(response.authorId()).isNull();
        assertThat(response.authorName()).isEqualTo("System");
    }

    @Test
    void create_unknownCandidate_throws() {
        when(candidateRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> noteService.create(NoteRequest.builder().candidateId(99L).body("x").build()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void delete_existingNote_deletes() {
        CandidateNote note = CandidateNote.builder().id(1L).candidate(candidate).body("x").build();
        when(noteRepository.findById(1L)).thenReturn(Optional.of(note));
        noteService.delete(1L);
        verify(noteRepository).delete(note);
    }

    @Test
    void delete_unknown_throws() {
        when(noteRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> noteService.delete(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
