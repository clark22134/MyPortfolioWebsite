package com.clarksprojects.ats.service;

import com.clarksprojects.ats.entity.Role;
import com.clarksprojects.ats.entity.User;
import com.clarksprojects.ats.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Seeds three demo users on startup so the portfolio demo can be explored
 * without going through a sign-up flow. Skipped automatically if the username
 * already exists, so re-runs are safe.
 *
 * <p>Disabled by default during tests via {@code app.demo-accounts.enabled=false}.
 */
@Component
@Order(10) // run after TalentPoolInitializer
@RequiredArgsConstructor
@Slf4j
public class DemoUserInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.demo-accounts.enabled:true}")
    private boolean enabled;

    @Value("${app.demo-accounts.admin-password:admin123}")
    private String adminPassword;

    @Value("${app.demo-accounts.recruiter-password:recruiter123}")
    private String recruiterPassword;

    @Value("${app.demo-accounts.manager-password:manager123}")
    private String managerPassword;

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            log.info("Demo accounts disabled — skipping seed");
            return;
        }
        seed("admin",     "admin@hireflow.dev",     "Avery Admin",    Role.ADMIN,          adminPassword);
        seed("recruiter", "recruiter@hireflow.dev", "Riley Recruiter", Role.RECRUITER,      recruiterPassword);
        seed("manager",   "manager@hireflow.dev",   "Morgan Manager",  Role.HIRING_MANAGER, managerPassword);
    }

    private void seed(String username, String email, String fullName, Role role, String rawPassword) {
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            return;
        }
        userRepository.save(User.builder()
                .username(username)
                .password(passwordEncoder.encode(rawPassword))
                .email(email)
                .fullName(fullName)
                .role(role)
                .enabled(true)
                .createdAt(LocalDateTime.now())
                .build());
        log.info("Seeded demo user {} ({})", username, role);
    }
}
