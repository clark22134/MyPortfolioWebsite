package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.TaskRequest;
import com.clarksprojects.ats.dto.TaskResponse;
import com.clarksprojects.ats.entity.*;
import com.clarksprojects.ats.exception.ResourceNotFoundException;
import com.clarksprojects.ats.repository.CandidateRepository;
import com.clarksprojects.ats.repository.FollowUpTaskRepository;
import com.clarksprojects.ats.repository.JobRepository;
import com.clarksprojects.ats.repository.UserRepository;
import com.clarksprojects.ats.security.CurrentUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock FollowUpTaskRepository taskRepository;
    @Mock CandidateRepository candidateRepository;
    @Mock JobRepository jobRepository;
    @Mock UserRepository userRepository;
    @Mock CurrentUserService currentUserService;
    @Mock ActivityService activityService;

    @InjectMocks TaskService taskService;

    private Candidate candidate;
    private Job job;
    private User user;

    @BeforeEach
    void setUp() {
        job = Job.builder().id(1L).employer("Acme").title("Eng").department("Eng")
                .location("R").status(JobStatus.OPEN).employmentType(EmploymentType.FULL_TIME).build();
        candidate = Candidate.builder().id(10L).firstName("A").lastName("B").email("a@b.com")
                .stage(PipelineStage.APPLIED).stageOrder(0).job(job).build();
        user = User.builder().id(1L).username("rec").password("x").email("r@x.com")
                .fullName("Rec").role(Role.RECRUITER).build();
    }

    @Test
    void listAll_noFilters_returnsAll() {
        when(taskRepository.findByOrderByDueAtAscCreatedAtDesc()).thenReturn(List.of());
        assertThat(taskService.listAll(null, null, null)).isEmpty();
    }

    @Test
    void listAll_byCandidate() {
        when(taskRepository.findByCandidateIdOrderByDueAtAscCreatedAtDesc(10L)).thenReturn(List.of());
        taskService.listAll(null, null, 10L);
        verify(taskRepository).findByCandidateIdOrderByDueAtAscCreatedAtDesc(10L);
    }

    @Test
    void listAll_byAssignee_resolvesUser() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(taskRepository.findByAssigneeOrderByDueAtAscCreatedAtDesc(user)).thenReturn(List.of());
        taskService.listAll(null, 1L, null);
        verify(taskRepository).findByAssigneeOrderByDueAtAscCreatedAtDesc(user);
    }

    @Test
    void listAll_byStatus_filters() {
        when(taskRepository.findByStatusOrderByDueAtAscCreatedAtDesc(TaskStatus.OPEN)).thenReturn(List.of());
        taskService.listAll(TaskStatus.OPEN, null, null);
        verify(taskRepository).findByStatusOrderByDueAtAscCreatedAtDesc(TaskStatus.OPEN);
    }

    @Test
    void myTasks_authenticated_returnsAssigned() {
        when(currentUserService.currentUser()).thenReturn(Optional.of(user));
        when(taskRepository.findByAssigneeOrderByDueAtAscCreatedAtDesc(user)).thenReturn(List.of());
        assertThat(taskService.myTasks()).isEmpty();
    }

    @Test
    void myTasks_unauthenticated_returnsEmpty() {
        when(currentUserService.currentUser()).thenReturn(Optional.empty());
        assertThat(taskService.myTasks()).isEmpty();
        verifyNoInteractions(taskRepository);
    }

    @Test
    void get_existing_returnsResponse() {
        FollowUpTask t = FollowUpTask.builder().id(1L).subject("Call").status(TaskStatus.OPEN).priority(TaskPriority.NORMAL).build();
        when(taskRepository.findById(1L)).thenReturn(Optional.of(t));
        TaskResponse out = taskService.get(1L);
        assertThat(out.subject()).isEqualTo("Call");
    }

    @Test
    void get_unknown_throws() {
        when(taskRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> taskService.get(99L)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void create_resolvesRelationsAndLogsActivity() {
        TaskRequest req = TaskRequest.builder()
                .subject("Follow up")
                .candidateId(10L)
                .jobId(1L)
                .assigneeId(1L)
                .priority(TaskPriority.HIGH)
                .dueAt(LocalDateTime.now().plusDays(1))
                .build();
        when(candidateRepository.findById(10L)).thenReturn(Optional.of(candidate));
        when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(currentUserService.currentUser()).thenReturn(Optional.of(user));
        when(taskRepository.save(any(FollowUpTask.class))).thenAnswer(inv -> {
            FollowUpTask t = inv.getArgument(0);
            t.setId(7L);
            return t;
        });

        TaskResponse out = taskService.create(req);

        assertThat(out.id()).isEqualTo(7L);
        assertThat(out.priority()).isEqualTo(TaskPriority.HIGH);
        verify(activityService).record(eq(ActivityType.TASK_CREATED), eq(candidate), eq(job),
                anyString(), anyMap());
    }

    @Test
    void create_unknownCandidate_throws() {
        TaskRequest req = TaskRequest.builder().subject("x").candidateId(99L).build();
        when(candidateRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> taskService.create(req))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void create_defaultsPriorityToNormal() {
        TaskRequest req = TaskRequest.builder().subject("x").build();
        when(currentUserService.currentUser()).thenReturn(Optional.empty());
        when(taskRepository.save(any(FollowUpTask.class))).thenAnswer(inv -> {
            FollowUpTask t = inv.getArgument(0);
            t.setId(1L);
            return t;
        });
        TaskResponse out = taskService.create(req);
        assertThat(out.priority()).isEqualTo(TaskPriority.NORMAL);
    }

    @Test
    void update_modifiesFields() {
        FollowUpTask existing = FollowUpTask.builder().id(1L).subject("old").status(TaskStatus.OPEN)
                .priority(TaskPriority.NORMAL).build();
        when(taskRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(taskRepository.save(any(FollowUpTask.class))).thenAnswer(inv -> inv.getArgument(0));

        TaskRequest req = TaskRequest.builder().subject("new").priority(TaskPriority.URGENT).build();
        TaskResponse out = taskService.update(1L, req);

        assertThat(out.subject()).isEqualTo("new");
        assertThat(out.priority()).isEqualTo(TaskPriority.URGENT);
    }

    @Test
    void updateStatus_done_setsCompletedAtAndLogs() {
        FollowUpTask existing = FollowUpTask.builder().id(1L).subject("x").status(TaskStatus.OPEN)
                .priority(TaskPriority.NORMAL).build();
        when(taskRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(taskRepository.save(any(FollowUpTask.class))).thenAnswer(inv -> inv.getArgument(0));

        TaskResponse out = taskService.updateStatus(1L, TaskStatus.DONE);

        assertThat(out.status()).isEqualTo(TaskStatus.DONE);
        assertThat(existing.getCompletedAt()).isNotNull();
        verify(activityService).record(eq(ActivityType.TASK_COMPLETED), any(), any(), anyString(), anyMap());
    }

    @Test
    void updateStatus_reopen_clearsCompletedAt() {
        FollowUpTask existing = FollowUpTask.builder().id(1L).subject("x").status(TaskStatus.DONE)
                .completedAt(LocalDateTime.now()).priority(TaskPriority.NORMAL).build();
        when(taskRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(taskRepository.save(any(FollowUpTask.class))).thenAnswer(inv -> inv.getArgument(0));

        taskService.updateStatus(1L, TaskStatus.OPEN);

        assertThat(existing.getCompletedAt()).isNull();
    }

    @Test
    void delete_existing_deletes() {
        FollowUpTask existing = FollowUpTask.builder().id(1L).subject("x").status(TaskStatus.OPEN).priority(TaskPriority.NORMAL).build();
        when(taskRepository.findById(1L)).thenReturn(Optional.of(existing));
        taskService.delete(1L);
        verify(taskRepository).delete(existing);
    }
}
