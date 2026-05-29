package com.clarksprojects.ats.controller;

import com.clarksprojects.ats.config.SecurityConfig;
import com.clarksprojects.ats.dto.TagAssignmentRequest;
import com.clarksprojects.ats.dto.TagRequest;
import com.clarksprojects.ats.dto.TagResponse;
import com.clarksprojects.ats.service.TagService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.LinkedHashSet;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TagController.class)
@Import({SecurityConfig.class, ControllerTestSupport.class})
@WithMockUser(roles = "RECRUITER")
class TagControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean TagService tagService;

    @Test
    void listAll_returnsAll() throws Exception {
        when(tagService.listAll()).thenReturn(List.of(new TagResponse(1L, "Top Pick", "#22c55e")));
        mockMvc.perform(get("/api/tags"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Top Pick"));
    }

    @Test
    void create_returnsCreated() throws Exception {
        when(tagService.create(any())).thenReturn(new TagResponse(1L, "x", "#000000"));
        mockMvc.perform(post("/api/tags")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TagRequest.builder().name("x").color("#000000").build())))
                .andExpect(status().isCreated());
    }

    @Test
    void create_invalidColor_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/tags")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TagRequest.builder().name("x").color("notacolor").build())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void update_returnsOk() throws Exception {
        when(tagService.update(any(), any())).thenReturn(new TagResponse(1L, "x", "#fff000"));
        mockMvc.perform(put("/api/tags/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TagRequest.builder().name("x").color("#fff000").build())))
                .andExpect(status().isOk());
    }

    @Test
    void delete_returnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/tags/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    void tagsForCandidate_returnsSet() throws Exception {
        when(tagService.tagsForCandidate(10L)).thenReturn(new LinkedHashSet<>(List.of(new TagResponse(1L, "Top", "#000"))));
        mockMvc.perform(get("/api/tags/candidate/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Top"));
    }

    @Test
    void setTagsForCandidate_returnsOk() throws Exception {
        when(tagService.setTagsForCandidate(any(), any())).thenReturn(Set.of());
        mockMvc.perform(put("/api/tags/candidate/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TagAssignmentRequest(Set.of(1L, 2L)))))
                .andExpect(status().isOk());
    }
}
