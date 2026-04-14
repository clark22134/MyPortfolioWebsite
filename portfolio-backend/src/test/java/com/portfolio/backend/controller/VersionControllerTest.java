package com.portfolio.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class VersionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getVersion_returnsVersionInfo() throws Exception {
        mockMvc.perform(get("/api/version").with(user("testuser")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").exists())
                .andExpect(jsonPath("$.commit").exists())
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void getVersion_returnsCorrectFormat() throws Exception {
        mockMvc.perform(get("/api/version").with(user("testuser")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").isString())
                .andExpect(jsonPath("$.commit").isString())
                .andExpect(jsonPath("$.timestamp").isString());
    }
}
