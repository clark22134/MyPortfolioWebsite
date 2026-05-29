package com.clarksprojects.ats.controller;

import com.clarksprojects.ats.config.SecurityConfig;
import com.clarksprojects.ats.dto.NoteRequest;
import com.clarksprojects.ats.dto.NoteResponse;
import com.clarksprojects.ats.service.NoteService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(NoteController.class)
@Import({SecurityConfig.class, ControllerTestSupport.class})
@WithMockUser(roles = "RECRUITER")
class NoteControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean NoteService noteService;

    private NoteResponse stub() {
        return new NoteResponse(1L, 10L, 1L, "Recruiter", "Looks good", LocalDateTime.now(), LocalDateTime.now());
    }

    @Test
    void list_returnsNotesForCandidate() throws Exception {
        when(noteService.listForCandidate(10L)).thenReturn(List.of(stub()));
        mockMvc.perform(get("/api/notes").param("candidateId", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].body").value("Looks good"));
    }

    @Test
    void create_validRequest_returnsCreated() throws Exception {
        when(noteService.create(any())).thenReturn(stub());
        mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(NoteRequest.builder()
                                .candidateId(10L).body("Looks good").build())))
                .andExpect(status().isCreated());
    }

    @Test
    void create_blankBody_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(NoteRequest.builder()
                                .candidateId(10L).body("").build())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void delete_returnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/notes/1"))
                .andExpect(status().isNoContent());
    }
}
