package com.clarksprojects.ats.service;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TalentPoolInitializer implements ApplicationRunner {

    private final JobService jobService;

    @Override
    public void run(ApplicationArguments args) {
        jobService.findOrCreateTalentPoolJob();
    }
}
