package com.clarksprojects.ats.controller;

import com.clarksprojects.ats.config.SecurityConfig;
import com.clarksprojects.ats.dto.TaskRequest;
import com.clarksprojects.ats.dto.TaskResponse;
import com.clarksprojects.ats.dto.TaskStatusRequest;
import com.clarksprojects.ats.entity.TaskPriority;
import com.clarksprojects.ats.entity.TaskStatus;
import com.clarksprojects.ats.service.TaskService;
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

@WebMvcTest(TaskController.class)
@Import({SecurityConfig.class, ControllerTestSupport.class})
@WithMockUser(roles = "RECRUITER")
class TaskControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean TaskService taskService;

    private TaskResponse stub() {
        return new TaskResponse(1L, "Call Alice", "desc", 10L, "Alice", 1L, "Eng",
                1L, "Recruiter", 1L, "Recruiter", TaskPriority.NORMAL, TaskStatus.OPEN,
                LocalDateTime.now().plusDays(1), LocalDateTime.now(), LocalDateTime.now(), null);
    }

    @Test
    void list_noFilters() throws Exception {
        when(taskService.listAll(null, null, null)).thenReturn(List.of(stub()));
        mockMvc.perform(get("/api/tasks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].subject").value("Call Alice"));
    }

    @Test
    void list_byStatus() throws Exception {
        when(taskService.listAll(TaskStatus.OPEN, null, null)).thenReturn(List.of(stub()));
        mockMvc.perform(get("/api/tasks").param("status", "OPEN"))
                .andExpect(status().isOk());
    }

    @Test
    void mine_returnsCallerTasks() throws Exception {
        when(taskService.myTasks()).thenReturn(List.of(stub()));
        mockMvc.perform(get("/api/tasks/mine"))
                .andExpect(status().isOk());
    }

    @Test
    void get_returnsTask() throws Exception {
        when(taskService.get(1L)).thenReturn(stub());
        mockMvc.perform(get("/api/tasks/1"))
                .andExpect(status().isOk());
    }

    @Test
    void create_validRequest_returnsCreated() throws Exception {
        when(taskService.create(any())).thenReturn(stub());
        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TaskRequest.builder()
                                .subject("Call").priority(TaskPriority.NORMAL).build())))
                .andExpect(status().isCreated());
    }

    @Test
    void create_blankSubject_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TaskRequest.builder().subject("").build())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void update_returnsOk() throws Exception {
        when(taskService.update(any(), any())).thenReturn(stub());
        mockMvc.perform(put("/api/tasks/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TaskRequest.builder()
                                .subject("Renamed").build())))
                .andExpect(status().isOk());
    }

    @Test
    void updateStatus_returnsOk() throws Exception {
        when(taskService.updateStatus(any(), any())).thenReturn(stub());
        mockMvc.perform(patch("/api/tasks/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TaskStatusRequest(TaskStatus.DONE))))
                .andExpect(status().isOk());
    }

    @Test
    void delete_returnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/tasks/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(roles = "HIRING_MANAGER")
    void create_hiringManager_returns403() throws Exception {
        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TaskRequest.builder().subject("x").build())))
                .andExpect(status().isForbidden());
    }
}
