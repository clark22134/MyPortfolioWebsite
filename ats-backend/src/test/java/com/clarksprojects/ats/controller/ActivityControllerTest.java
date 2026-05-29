package com.clarksprojects.ats.controller;

import com.clarksprojects.ats.config.SecurityConfig;
import com.clarksprojects.ats.dto.ActivityResponse;
import com.clarksprojects.ats.entity.ActivityType;
import com.clarksprojects.ats.service.ActivityService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ActivityController.class)
@Import({SecurityConfig.class, ControllerTestSupport.class})
@WithMockUser(roles = "RECRUITER")
class ActivityControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean ActivityService activityService;

    private ActivityResponse stub() {
        return new ActivityResponse(1L, ActivityType.STAGE_CHANGED, 10L, "Alice", 1L, "Eng",
                1L, "Rec", "Moved", "from=APPLIED;to=SCREENING", LocalDateTime.now());
    }

    @Test
    void list_recent_default() throws Exception {
        when(activityService.recent(20)).thenReturn(List.of(stub()));
        mockMvc.perform(get("/api/activities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].type").value("STAGE_CHANGED"));
    }

    @Test
    void list_byCandidate() throws Exception {
        when(activityService.forCandidate(10L)).thenReturn(List.of(stub()));
        mockMvc.perform(get("/api/activities").param("candidateId", "10"))
                .andExpect(status().isOk());
    }

    @Test
    void list_byJob() throws Exception {
        when(activityService.forJob(1L)).thenReturn(List.of(stub()));
        mockMvc.perform(get("/api/activities").param("jobId", "1"))
                .andExpect(status().isOk());
    }

    @Test
    void list_customLimit() throws Exception {
        when(activityService.recent(5)).thenReturn(List.of());
        mockMvc.perform(get("/api/activities").param("limit", "5"))
                .andExpect(status().isOk());
    }
}
