package com.clarksprojects.ats.controller;

import com.clarksprojects.ats.dto.TagAssignmentRequest;
import com.clarksprojects.ats.dto.TagRequest;
import com.clarksprojects.ats.dto.TagResponse;
import com.clarksprojects.ats.service.TagService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    @GetMapping
    public List<TagResponse> listAll() {
        return tagService.listAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TagResponse create(@Valid @RequestBody TagRequest request) {
        return tagService.create(request);
    }

    @PutMapping("/{id}")
    public TagResponse update(@PathVariable Long id, @Valid @RequestBody TagRequest request) {
        return tagService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        tagService.delete(id);
    }

    @GetMapping("/candidate/{candidateId}")
    public Set<TagResponse> tagsForCandidate(@PathVariable Long candidateId) {
        return tagService.tagsForCandidate(candidateId);
    }

    @PutMapping("/candidate/{candidateId}")
    public Set<TagResponse> setTagsForCandidate(@PathVariable Long candidateId,
                                                @Valid @RequestBody TagAssignmentRequest request) {
        return tagService.setTagsForCandidate(candidateId, request.getTagIds());
    }
}
