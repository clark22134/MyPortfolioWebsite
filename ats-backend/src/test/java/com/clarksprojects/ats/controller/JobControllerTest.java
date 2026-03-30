package com.clarksprojects.ats.controller;

import com.clarksprojects.ats.dto.JobRequest;
import com.clarksprojects.ats.dto.JobResponse;
import com.clarksprojects.ats.entity.EmploymentType;
import com.clarksprojects.ats.entity.JobStatus;
import com.clarksprojects.ats.exception.ResourceNotFoundException;
import com.clarksprojects.ats.service.JobService;
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

@WebMvcTest(JobController.class)
class JobControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private JobService jobService;

    private JobResponse buildJobResponse(Long id, String title, JobStatus status) {
        return JobResponse.builder()
                .id(id)
                .employer("Acme Technologies")
                .title(title)
                .department("Engineering")
                .location("Remote")
                .description("Test job")
                .status(status)
                .employmentType(EmploymentType.FULL_TIME)
                .candidateCount(0)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    void getAllJobs_returnsOkWithList() throws Exception {
        when(jobService.getAllJobs()).thenReturn(List.of(
                buildJobResponse(1L, "Software Engineer", JobStatus.OPEN),
                buildJobResponse(2L, "Designer", JobStatus.DRAFT)
        ));

        mockMvc.perform(get("/api/jobs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("Software Engineer"))
                .andExpect(jsonPath("$[1].title").value("Designer"));
    }

    @Test
    void getAllJobs_withStatusFilter_delegatesToFilteredService() throws Exception {
        when(jobService.getJobsByStatus(JobStatus.OPEN)).thenReturn(List.of(
                buildJobResponse(1L, "Software Engineer", JobStatus.OPEN)
        ));

        mockMvc.perform(get("/api/jobs").param("status", "OPEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].status").value("OPEN"));

        verify(jobService).getJobsByStatus(JobStatus.OPEN);
        verify(jobService, never()).getAllJobs();
    }

    @Test
    void getJob_existingId_returnsOk() throws Exception {
        when(jobService.getJob(1L)).thenReturn(buildJobResponse(1L, "Software Engineer", JobStatus.OPEN));

        mockMvc.perform(get("/api/jobs/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.title").value("Software Engineer"))
                .andExpect(jsonPath("$.status").value("OPEN"));
    }

    @Test
    void getJob_nonExistentId_returnsNotFound() throws Exception {
        when(jobService.getJob(99L)).thenThrow(new ResourceNotFoundException("Job not found: 99"));

        mockMvc.perform(get("/api/jobs/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Job not found: 99"));
    }

    @Test
    void createJob_validRequest_returnsCreated() throws Exception {
        JobRequest request = JobRequest.builder()
                .employer("Acme Technologies")
                .title("DevOps Engineer")
                .department("Platform")
                .location("Remote")
                .description("CI/CD")
                .status(JobStatus.OPEN)
                .employmentType(EmploymentType.FULL_TIME)
                .build();

        when(jobService.createJob(any(JobRequest.class))).thenReturn(buildJobResponse(3L, "DevOps Engineer", JobStatus.OPEN));

        mockMvc.perform(post("/api/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(3))
                .andExpect(jsonPath("$.title").value("DevOps Engineer"));
    }

    @Test
    void createJob_missingRequiredFields_returnsBadRequest() throws Exception {
        JobRequest invalid = new JobRequest(); // all fields null

        mockMvc.perform(post("/api/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").exists());
    }

    @Test
    void createJob_blankTitle_returnsBadRequest() throws Exception {
        JobRequest request = JobRequest.builder()
                .title("")
                .department("Engineering")
                .location("Remote")
                .status(JobStatus.OPEN)
                .employmentType(EmploymentType.FULL_TIME)
                .build();

        mockMvc.perform(post("/api/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateJob_validRequest_returnsOk() throws Exception {
        JobRequest request = JobRequest.builder()
                .employer("Acme Technologies")
                .title("Senior Software Engineer")
                .department("Engineering")
                .location("Remote")
                .status(JobStatus.CLOSED)
                .employmentType(EmploymentType.CONTRACT)
                .build();

        when(jobService.updateJob(eq(1L), any(JobRequest.class)))
                .thenReturn(buildJobResponse(1L, "Senior Software Engineer", JobStatus.CLOSED));

        mockMvc.perform(put("/api/jobs/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Senior Software Engineer"))
                .andExpect(jsonPath("$.status").value("CLOSED"));
    }

    @Test
    void updateJob_nonExistentId_returnsNotFound() throws Exception {
        JobRequest request = JobRequest.builder()
                .employer("Any").title("Any").department("Any").location("Any")
                .status(JobStatus.OPEN).employmentType(EmploymentType.FULL_TIME)
                .build();

        when(jobService.updateJob(eq(99L), any())).thenThrow(new ResourceNotFoundException("Job not found: 99"));

        mockMvc.perform(put("/api/jobs/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteJob_existingId_returnsNoContent() throws Exception {
        doNothing().when(jobService).deleteJob(1L);

        mockMvc.perform(delete("/api/jobs/1"))
                .andExpect(status().isNoContent());

        verify(jobService).deleteJob(1L);
    }

    @Test
    void deleteJob_nonExistentId_returnsNotFound() throws Exception {
        doThrow(new ResourceNotFoundException("Job not found: 99")).when(jobService).deleteJob(99L);

        mockMvc.perform(delete("/api/jobs/99"))
                .andExpect(status().isNotFound());
    }
}
