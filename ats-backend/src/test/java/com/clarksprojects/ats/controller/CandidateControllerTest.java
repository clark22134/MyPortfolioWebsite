package com.clarksprojects.ats.controller;

import com.clarksprojects.ats.dto.CandidateRequest;
import com.clarksprojects.ats.dto.CandidateResponse;
import com.clarksprojects.ats.dto.StageMoveRequest;
import com.clarksprojects.ats.entity.PipelineStage;
import com.clarksprojects.ats.service.CandidateService;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CandidateController.class)
class CandidateControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CandidateService candidateService;

    private CandidateResponse buildResponse(Long id, String firstName, PipelineStage stage) {
        return CandidateResponse.builder()
                .id(id)
                .firstName(firstName)
                .lastName("Lastname")
                .email(firstName.toLowerCase() + "@example.com")
                .stage(stage)
                .stageOrder(0)
                .jobId(1L)
                .jobTitle("Software Engineer")
                .appliedAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    void getCandidates_byJobId_returnsOkWithList() throws Exception {
        when(candidateService.getCandidatesByJob(1L)).thenReturn(List.of(
                buildResponse(10L, "Alice", PipelineStage.APPLIED),
                buildResponse(11L, "Bob", PipelineStage.SCREENING)
        ));

        mockMvc.perform(get("/api/candidates").param("jobId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].firstName").value("Alice"))
                .andExpect(jsonPath("$[1].stage").value("SCREENING"));
    }

    @Test
    void getCandidates_byJobIdAndStage_delegatesToFilteredService() throws Exception {
        when(candidateService.getCandidatesByJobAndStage(1L, PipelineStage.APPLIED)).thenReturn(List.of(
                buildResponse(10L, "Alice", PipelineStage.APPLIED)
        ));

        mockMvc.perform(get("/api/candidates").param("jobId", "1").param("stage", "APPLIED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].stage").value("APPLIED"));

        verify(candidateService).getCandidatesByJobAndStage(1L, PipelineStage.APPLIED);
        verify(candidateService, never()).getCandidatesByJob(any());
    }

    @Test
    void getCandidate_existingId_returnsOk() throws Exception {
        when(candidateService.getCandidate(10L)).thenReturn(buildResponse(10L, "Alice", PipelineStage.APPLIED));

        mockMvc.perform(get("/api/candidates/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.firstName").value("Alice"))
                .andExpect(jsonPath("$.jobId").value(1));
    }

    @Test
    void getCandidate_nonExistentId_returnsNotFound() throws Exception {
        when(candidateService.getCandidate(99L)).thenThrow(new IllegalArgumentException("Candidate not found: 99"));

        mockMvc.perform(get("/api/candidates/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Candidate not found: 99"));
    }

    @Test
    void createCandidate_validRequest_returnsCreated() throws Exception {
        CandidateRequest request = CandidateRequest.builder()
                .firstName("Carol")
                .lastName("Williams")
                .email("carol@example.com")
                .stage(PipelineStage.APPLIED)
                .jobId(1L)
                .build();

        when(candidateService.createCandidate(any(CandidateRequest.class)))
                .thenReturn(buildResponse(12L, "Carol", PipelineStage.APPLIED));

        mockMvc.perform(post("/api/candidates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(12))
                .andExpect(jsonPath("$.firstName").value("Carol"));
    }

    @Test
    void createCandidate_missingRequiredFields_returnsBadRequest() throws Exception {
        CandidateRequest invalid = new CandidateRequest();

        mockMvc.perform(post("/api/candidates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.firstName").exists());
    }

    @Test
    void createCandidate_invalidEmail_returnsBadRequest() throws Exception {
        CandidateRequest request = CandidateRequest.builder()
                .firstName("Dave").lastName("Brown")
                .email("not-an-email")
                .stage(PipelineStage.APPLIED)
                .jobId(1L)
                .build();

        mockMvc.perform(post("/api/candidates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.email").exists());
    }

    @Test
    void updateCandidate_validRequest_returnsOk() throws Exception {
        CandidateRequest request = CandidateRequest.builder()
                .firstName("Alice")
                .lastName("Updated")
                .email("alice.updated@example.com")
                .stage(PipelineStage.INTERVIEW)
                .jobId(1L)
                .build();

        when(candidateService.updateCandidate(eq(10L), any(CandidateRequest.class)))
                .thenReturn(buildResponse(10L, "Alice", PipelineStage.INTERVIEW));

        mockMvc.perform(put("/api/candidates/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stage").value("INTERVIEW"));
    }

    @Test
    void moveStage_validRequest_returnsOk() throws Exception {
        StageMoveRequest request = new StageMoveRequest(PipelineStage.OFFER, 1);

        CandidateResponse response = buildResponse(10L, "Alice", PipelineStage.OFFER);
        response.setStageOrder(1);

        when(candidateService.moveStage(eq(10L), any(StageMoveRequest.class))).thenReturn(response);

        mockMvc.perform(patch("/api/candidates/10/stage")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stage").value("OFFER"))
                .andExpect(jsonPath("$.stageOrder").value(1));
    }

    @Test
    void moveStage_missingNewStage_returnsBadRequest() throws Exception {
        StageMoveRequest invalid = new StageMoveRequest(null, null);

        mockMvc.perform(patch("/api/candidates/10/stage")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.newStage").exists());
    }

    @Test
    void deleteCandidate_existingId_returnsNoContent() throws Exception {
        doNothing().when(candidateService).deleteCandidate(10L);

        mockMvc.perform(delete("/api/candidates/10"))
                .andExpect(status().isNoContent());

        verify(candidateService).deleteCandidate(10L);
    }

    @Test
    void deleteCandidate_nonExistentId_returnsNotFound() throws Exception {
        doThrow(new IllegalArgumentException("Candidate not found: 99")).when(candidateService).deleteCandidate(99L);

        mockMvc.perform(delete("/api/candidates/99"))
                .andExpect(status().isNotFound());
    }
}
