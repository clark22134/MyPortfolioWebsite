package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.TagRequest;
import com.clarksprojects.ats.dto.TagResponse;
import com.clarksprojects.ats.entity.ActivityType;
import com.clarksprojects.ats.entity.Candidate;
import com.clarksprojects.ats.entity.Tag;
import com.clarksprojects.ats.repository.CandidateRepository;
import com.clarksprojects.ats.repository.TagRepository;
import com.clarksprojects.ats.util.Entities;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;
    private final CandidateRepository candidateRepository;
    private final ActivityService activityService;

    @Transactional(readOnly = true)
    public List<TagResponse> listAll() {
        return tagRepository.findAllByOrderByNameAsc().stream().map(TagResponse::from).toList();
    }

    @Transactional
    public TagResponse create(TagRequest request) {
        if (tagRepository.existsByNameIgnoreCase(request.getName())) {
            throw new IllegalArgumentException("Tag already exists: " + request.getName());
        }
        Tag tag = tagRepository.save(Tag.builder()
                .name(request.getName().trim())
                .color(blankToNull(request.getColor()))
                .build());
        return TagResponse.from(tag);
    }

    @Transactional
    public TagResponse update(Long id, TagRequest request) {
        Tag tag = findOrThrow(id);
        tag.setName(request.getName().trim());
        tag.setColor(blankToNull(request.getColor()));
        return TagResponse.from(tagRepository.save(tag));
    }

    @Transactional
    public void delete(Long id) {
        Tag tag = findOrThrow(id);
        tagRepository.delete(tag);
    }

    @Transactional(readOnly = true)
    public Set<TagResponse> tagsForCandidate(Long candidateId) {
        Candidate c = findCandidate(candidateId);
        Set<TagResponse> result = new LinkedHashSet<>();
        c.getTags().stream()
                .sorted(Comparator.comparing(Tag::getName, String.CASE_INSENSITIVE_ORDER))
                .forEach(t -> result.add(TagResponse.from(t)));
        return result;
    }

    @Transactional
    public Set<TagResponse> setTagsForCandidate(Long candidateId, Set<Long> tagIds) {
        Candidate candidate = findCandidate(candidateId);
        Set<Tag> previous = new HashSet<>(candidate.getTags());
        Set<Tag> next = new HashSet<>(tagRepository.findAllById(tagIds == null ? Set.of() : tagIds));
        candidate.setTags(next);
        candidateRepository.save(candidate);

        for (Tag added : next) {
            if (!previous.contains(added)) {
                activityService.record(ActivityType.TAG_ADDED, candidate, candidate.getJob(),
                        "Tagged: " + added.getName(),
                        Map.of("tagId", String.valueOf(added.getId()), "tag", added.getName()));
            }
        }
        for (Tag removed : previous) {
            if (!next.contains(removed)) {
                activityService.record(ActivityType.TAG_REMOVED, candidate, candidate.getJob(),
                        "Untagged: " + removed.getName(),
                        Map.of("tagId", String.valueOf(removed.getId()), "tag", removed.getName()));
            }
        }
        return tagsForCandidate(candidateId);
    }

    private Tag findOrThrow(Long id) {
        return Entities.findOrThrow(tagRepository, id, "Tag");
    }

    private Candidate findCandidate(Long id) {
        return Entities.findOrThrow(candidateRepository, id, "Candidate");
    }

    private static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v;
    }
}
