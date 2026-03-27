package com.clarksprojects.ats.controller;

import com.clarksprojects.ats.dto.DashboardStats;
import com.clarksprojects.ats.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public DashboardStats getStats() {
        return dashboardService.getStats();
    }
}
