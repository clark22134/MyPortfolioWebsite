package com.clarksprojects.ats.controller;

import com.clarksprojects.ats.dto.DashboardStats;
import com.clarksprojects.ats.entity.PipelineStage;
import com.clarksprojects.ats.service.DashboardService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DashboardController.class)
class DashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DashboardService dashboardService;

    @Test
    void getStats_returnsOkWithAllFields() throws Exception {
        Map<String, Long> byStage = new LinkedHashMap<>();
        for (PipelineStage stage : PipelineStage.values()) {
            byStage.put(stage.name(), 0L);
        }
        byStage.put(PipelineStage.APPLIED.name(), 3L);
        byStage.put(PipelineStage.SCREENING.name(), 2L);

        Map<String, Long> byEmployer = new LinkedHashMap<>();
        byEmployer.put("Acme Technologies", 3L);
        byEmployer.put("DataBridge Inc", 2L);
        byEmployer.put("GrowthMedia", 1L);

        DashboardStats stats = new DashboardStats(6L, 4L, 13L, byStage, byEmployer);

        when(dashboardService.getStats()).thenReturn(stats);

        mockMvc.perform(get("/api/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalJobs").value(6))
                .andExpect(jsonPath("$.openJobs").value(4))
                .andExpect(jsonPath("$.totalCandidates").value(13))
                .andExpect(jsonPath("$.candidatesByStage.APPLIED").value(3))
                .andExpect(jsonPath("$.candidatesByStage.SCREENING").value(2))
                .andExpect(jsonPath("$.jobsByEmployer['Acme Technologies']").value(3))
                .andExpect(jsonPath("$.jobsByEmployer['DataBridge Inc']").value(2));
    }

    @Test
    void getStats_emptyDatabase_returnsZeroValues() throws Exception {
        Map<String, Long> byStage = new LinkedHashMap<>();
        for (PipelineStage stage : PipelineStage.values()) {
            byStage.put(stage.name(), 0L);
        }

        DashboardStats stats = new DashboardStats(0L, 0L, 0L, byStage, new LinkedHashMap<>());

        when(dashboardService.getStats()).thenReturn(stats);

        mockMvc.perform(get("/api/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalJobs").value(0))
                .andExpect(jsonPath("$.openJobs").value(0))
                .andExpect(jsonPath("$.totalCandidates").value(0));
    }
}
