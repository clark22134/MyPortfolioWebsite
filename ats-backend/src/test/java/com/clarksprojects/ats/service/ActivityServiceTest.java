package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.ActivityResponse;
import com.clarksprojects.ats.entity.*;
import com.clarksprojects.ats.repository.ActivityRepository;
import com.clarksprojects.ats.security.CurrentUserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ActivityServiceTest {

    @Mock ActivityRepository activityRepository;
    @Mock CurrentUserService currentUserService;

    @InjectMocks ActivityService activityService;

    private Activity activity() {
        Job job = Job.builder().id(1L).employer("Acme").title("Engineer").department("Eng")
                .location("R").status(JobStatus.OPEN).employmentType(EmploymentType.FULL_TIME).build();
        Candidate c = Candidate.builder().id(10L).firstName("A").lastName("B").email("a@b.com")
                .stage(PipelineStage.APPLIED).stageOrder(0).job(job).build();
        return Activity.builder().id(1L).type(ActivityType.STAGE_CHANGED).candidate(c).job(job)
                .summary("Moved").metadata("from=APPLIED;to=SCREENING").build();
    }

    @Test
    void record_serializesMetadataAndSetsActor() {
        User actor = User.builder().id(1L).username("rec").password("x").email("r@x.com")
                .fullName("Rec").role(Role.RECRUITER).build();
        when(currentUserService.currentUser()).thenReturn(Optional.of(actor));
        when(activityRepository.save(any(Activity.class))).thenAnswer(inv -> inv.getArgument(0));

        Activity saved = activityService.record(ActivityType.NOTE_ADDED, null, null, "added note",
                Map.of("noteId", "1", "preview", "Strong fit"));

        ArgumentCaptor<Activity> captor = ArgumentCaptor.forClass(Activity.class);
        org.mockito.Mockito.verify(activityRepository).save(captor.capture());
        Activity persisted = captor.getValue();
        assertThat(persisted.getActor()).isEqualTo(actor);
        assertThat(persisted.getType()).isEqualTo(ActivityType.NOTE_ADDED);
        assertThat(persisted.getMetadata()).contains("noteId=1").contains("preview=Strong fit");
        assertThat(saved).isSameAs(persisted);
    }

    @Test
    void record_nullMetadata_storesNull() {
        when(currentUserService.currentUser()).thenReturn(Optional.empty());
        when(activityRepository.save(any(Activity.class))).thenAnswer(inv -> inv.getArgument(0));

        Activity saved = activityService.record(ActivityType.JOB_CREATED, null, null, "created", null);

        assertThat(saved.getMetadata()).isNull();
        assertThat(saved.getActor()).isNull();
    }

    @Test
    void forCandidate_mapsToResponses() {
        when(activityRepository.findByCandidateIdOrderByCreatedAtDesc(10L))
                .thenReturn(List.of(activity()));
        List<ActivityResponse> out = activityService.forCandidate(10L);
        assertThat(out).hasSize(1);
        assertThat(out.get(0).type()).isEqualTo(ActivityType.STAGE_CHANGED);
    }

    @Test
    void forJob_mapsToResponses() {
        when(activityRepository.findByJobIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(activity()));
        assertThat(activityService.forJob(1L)).hasSize(1);
    }

    @Test
    void recent_usesPageableLimit() {
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        when(activityRepository.findAllByOrderByCreatedAtDesc(any())).thenReturn(List.of());

        activityService.recent(5);

        org.mockito.Mockito.verify(activityRepository).findAllByOrderByCreatedAtDesc(captor.capture());
        assertThat(captor.getValue()).isEqualTo(PageRequest.of(0, 5));
    }

    @Test
    void recent_zeroOrNegativeClampedTo1() {
        when(activityRepository.findAllByOrderByCreatedAtDesc(any())).thenReturn(List.of());
        activityService.recent(0);
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        org.mockito.Mockito.verify(activityRepository).findAllByOrderByCreatedAtDesc(captor.capture());
        assertThat(captor.getValue().getPageSize()).isEqualTo(1);
    }
}
