package com.clarksprojects.ats.controller;

import com.clarksprojects.ats.config.SecurityConfig;
import com.clarksprojects.ats.dto.CreateUserRequest;
import com.clarksprojects.ats.dto.UpdateUserRequest;
import com.clarksprojects.ats.dto.UserInfoResponse;
import com.clarksprojects.ats.entity.Role;
import com.clarksprojects.ats.service.UserService;
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

@WebMvcTest(UserController.class)
@Import({SecurityConfig.class, ControllerTestSupport.class})
class UserControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean UserService userService;

    private UserInfoResponse info(String name, Role role) {
        return new UserInfoResponse(1L, name, name + "@b.com", name, role, true, LocalDateTime.now(), null);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void list_admin_returnsAllUsers() throws Exception {
        when(userService.listAll()).thenReturn(List.of(info("alice", Role.RECRUITER)));
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("alice"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void list_byRole_filters() throws Exception {
        when(userService.listByRole(Role.RECRUITER)).thenReturn(List.of(info("a", Role.RECRUITER)));
        mockMvc.perform(get("/api/users").param("role", "RECRUITER"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "RECRUITER")
    void list_nonAdmin_returns403() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    void list_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void get_admin_returnsUser() throws Exception {
        when(userService.get(1L)).thenReturn(info("alice", Role.RECRUITER));
        mockMvc.perform(get("/api/users/1"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void create_admin_returnsCreated() throws Exception {
        CreateUserRequest req = CreateUserRequest.builder()
                .username("bob").password("longpassword").email("b@b.com")
                .fullName("Bob").role(Role.RECRUITER).build();
        when(userService.create(any())).thenReturn(info("bob", Role.RECRUITER));
        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void create_shortPassword_returnsBadRequest() throws Exception {
        CreateUserRequest req = CreateUserRequest.builder()
                .username("bob").password("short").email("b@b.com")
                .fullName("Bob").role(Role.RECRUITER).build();
        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void update_admin_returnsOk() throws Exception {
        UpdateUserRequest req = UpdateUserRequest.builder()
                .email("new@x.com").fullName("New").role(Role.HIRING_MANAGER).enabled(true).build();
        when(userService.update(any(), any())).thenReturn(info("alice", Role.HIRING_MANAGER));
        mockMvc.perform(put("/api/users/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void delete_admin_returnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/users/1"))
                .andExpect(status().isNoContent());
    }
}
