package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.TagRequest;
import com.clarksprojects.ats.dto.TagResponse;
import com.clarksprojects.ats.entity.*;
import com.clarksprojects.ats.exception.ResourceNotFoundException;
import com.clarksprojects.ats.repository.CandidateRepository;
import com.clarksprojects.ats.repository.TagRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TagServiceTest {

    @Mock TagRepository tagRepository;
    @Mock CandidateRepository candidateRepository;
    @Mock ActivityService activityService;

    @InjectMocks TagService tagService;

    private Candidate candidate;
    private Tag topPick;
    private Tag referral;

    @BeforeEach
    void setUp() {
        Job job = Job.builder().id(1L).employer("Acme").title("Eng").department("Eng").location("R")
                .status(JobStatus.OPEN).employmentType(EmploymentType.FULL_TIME).build();
        candidate = Candidate.builder().id(10L).firstName("A").lastName("B").email("a@b.com")
                .stage(PipelineStage.APPLIED).stageOrder(0).job(job).tags(new HashSet<>()).build();
        topPick = Tag.builder().id(1L).name("Top Pick").color("#22c55e").build();
        referral = Tag.builder().id(2L).name("Referral").color("#3b82f6").build();
    }

    @Test
    void listAll_returnsAlphabetical() {
        when(tagRepository.findAllByOrderByNameAsc()).thenReturn(List.of(referral, topPick));
        List<TagResponse> result = tagService.listAll();
        assertThat(result).extracting(TagResponse::name).containsExactly("Referral", "Top Pick");
    }

    @Test
    void create_uniqueName_saves() {
        TagRequest req = TagRequest.builder().name("New").color("#000000").build();
        when(tagRepository.existsByNameIgnoreCase("New")).thenReturn(false);
        when(tagRepository.save(any(Tag.class))).thenAnswer(inv -> {
            Tag t = inv.getArgument(0);
            t.setId(99L);
            return t;
        });

        TagResponse out = tagService.create(req);
        assertThat(out.name()).isEqualTo("New");
        assertThat(out.color()).isEqualTo("#000000");
    }

    @Test
    void create_blankColor_storesNull() {
        TagRequest req = TagRequest.builder().name("Plain").color("").build();
        when(tagRepository.existsByNameIgnoreCase("Plain")).thenReturn(false);
        when(tagRepository.save(any(Tag.class))).thenAnswer(inv -> inv.getArgument(0));
        TagResponse out = tagService.create(req);
        assertThat(out.color()).isNull();
    }

    @Test
    void create_duplicate_throws() {
        when(tagRepository.existsByNameIgnoreCase("dupe")).thenReturn(true);
        assertThatThrownBy(() -> tagService.create(TagRequest.builder().name("dupe").build()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void update_changesFields() {
        when(tagRepository.findById(1L)).thenReturn(Optional.of(topPick));
        when(tagRepository.save(any(Tag.class))).thenAnswer(inv -> inv.getArgument(0));
        TagResponse out = tagService.update(1L, TagRequest.builder().name("Renamed").color("#ffffff").build());
        assertThat(out.name()).isEqualTo("Renamed");
        assertThat(out.color()).isEqualTo("#ffffff");
    }

    @Test
    void delete_existing_deletes() {
        when(tagRepository.findById(1L)).thenReturn(Optional.of(topPick));
        tagService.delete(1L);
        verify(tagRepository).delete(topPick);
    }

    @Test
    void delete_unknown_throws() {
        when(tagRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> tagService.delete(99L)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void tagsForCandidate_returnsSortedTags() {
        candidate.setTags(new HashSet<>(List.of(referral, topPick)));
        when(candidateRepository.findById(10L)).thenReturn(Optional.of(candidate));
        Set<TagResponse> result = tagService.tagsForCandidate(10L);
        assertThat(result).extracting(TagResponse::name).containsExactly("Referral", "Top Pick");
    }

    @Test
    void setTagsForCandidate_addsAndRemoves_logsActivityForEach() {
        candidate.setTags(new HashSet<>(List.of(topPick)));
        when(candidateRepository.findById(10L)).thenReturn(Optional.of(candidate));
        when(tagRepository.findAllById(Set.of(2L))).thenReturn(List.of(referral));

        tagService.setTagsForCandidate(10L, Set.of(2L));

        verify(activityService).record(eq(ActivityType.TAG_ADDED), eq(candidate), eq(candidate.getJob()),
                anyString(), anyMap());
        verify(activityService).record(eq(ActivityType.TAG_REMOVED), eq(candidate), eq(candidate.getJob()),
                anyString(), anyMap());
    }

    @Test
    void setTagsForCandidate_nullIds_treatedAsEmpty() {
        candidate.setTags(new HashSet<>());
        when(candidateRepository.findById(10L)).thenReturn(Optional.of(candidate));
        when(tagRepository.findAllById(any())).thenReturn(List.of());
        tagService.setTagsForCandidate(10L, null);
        verifyNoInteractions(activityService);
    }
}
