package com.portfolio.backend.config;

import com.portfolio.backend.entity.Project;
import com.portfolio.backend.entity.User;
import com.portfolio.backend.repository.ProjectRepository;
import com.portfolio.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

/**
 * Initializes database with default data on application startup.
 * Creates admin user and sample projects if not present.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(
            UserRepository userRepository,
            ProjectRepository projectRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        initializeAdminUser();
        removeLegacyProjects();
        updateExistingProjects();
        initializeSampleProjects();
    }

    private void initializeAdminUser() {
        AdminCredentials credentials = AdminCredentials.fromEnvironment();

        userRepository.findByUsername(credentials.username())
                .ifPresentOrElse(
                        existingUser -> updateExistingUser(existingUser, credentials),
                        () -> createNewUser(credentials)
                );
    }

    private void updateExistingUser(User user, AdminCredentials credentials) {
        user.setPassword(passwordEncoder.encode(credentials.password()));
        user.setEmail(credentials.email());
        user.setFullName(credentials.fullName());
        userRepository.save(user);
        log.debug("Updated admin user: {}", credentials.username());
    }

    private void createNewUser(AdminCredentials credentials) {
        User user = new User();
        user.setUsername(credentials.username());
        user.setPassword(passwordEncoder.encode(credentials.password()));
        user.setEmail(credentials.email());
        user.setFullName(credentials.fullName());
        userRepository.save(user);
        log.info("Created admin user: {}", credentials.username());
    }

    private void removeLegacyProjects() {
        projectRepository.findByTitle("SecureCloud DevOps Platform").ifPresent(project -> {
            projectRepository.delete(project);
            log.debug("Removed legacy SecureCloud DevOps Platform project");
        });
        projectRepository.findByTitle("Portfolio Website").ifPresent(project -> {
            projectRepository.delete(project);
            log.debug("Removed legacy Portfolio Website project");
        });
        projectRepository.findByTitle("Task Management System").ifPresent(project -> {
            projectRepository.delete(project);
            log.debug("Removed legacy Task Management System project");
        });
    }

    private void updateExistingProjects() {
        projectRepository.findByTitle("E-Commerce Platform").ifPresent(project -> {
            project.setDemoUrl("https://shop.clarkfoster.com");
            project.setTechnologies(List.of("Angular", "Spring Boot", "MySQL", "JWT", "Spring Data REST", "Bootstrap"));
            projectRepository.save(project);
            log.debug("Updated E-Commerce Platform project with demo URL");
        });
    }

    private void initializeSampleProjects() {
        if (projectRepository.findByTitle("E-Commerce Platform").isEmpty()) {
            log.info("Initializing E-Commerce Platform project");
            createProject(
                    "E-Commerce Platform",
                    "A full-stack e-commerce application built with Angular and Spring Boot, featuring user authentication, product management, shopping cart, and payment integration.",
                    List.of("Angular", "Spring Boot", "MySQL", "JWT", "Spring Data REST", "Bootstrap"),
                    null,
                    null,
                    "https://shop.clarkfoster.com"
            );
        }

        if (projectRepository.findByTitle("Applicant Tracking System").isEmpty()) {
            log.info("Initializing Applicant Tracking System project");
            createProject(
                    "Applicant Tracking System",
                    "A full-stack ATS with Kanban pipeline boards to manage candidates through screening, interviews, offers, and onboarding.",
                    List.of("Angular", "Spring Boot", "PostgreSQL", "JWT", "Kanban"),
                    null,
                    null,
                    "https://ats.clarkfoster.com"
            );
        }

    }

    private void createProject(String title, String description, List<String> technologies,
                               LocalDate startDate, LocalDate endDate, String demoUrl) {
        Project project = new Project();
        project.setTitle(title);
        project.setDescription(description);
        project.setTechnologies(technologies);
        project.setGithubUrl("https://github.com/clark22134");
        project.setDemoUrl(demoUrl);
        project.setStartDate(startDate);
        project.setEndDate(endDate);
        project.setFeatured(true);
        projectRepository.save(project);
    }

    /**
     * Record to hold admin credentials from environment variables.
     */
    private record AdminCredentials(String username, String password, String email, String fullName) {
        private static final String DEFAULT_USERNAME = "admin";
        private static final String DEFAULT_PASSWORD = "defaultPassword";
        private static final String DEFAULT_EMAIL = "admin@clarkfoster.com";
        private static final String DEFAULT_FULL_NAME = "Clark Foster";

        static AdminCredentials fromEnvironment() {
            return new AdminCredentials(
                    getEnvOrDefault("ADMIN_USERNAME", DEFAULT_USERNAME),
                    getEnvOrDefault("ADMIN_PASSWORD", DEFAULT_PASSWORD),
                    getEnvOrDefault("ADMIN_EMAIL", DEFAULT_EMAIL),
                    getEnvOrDefault("ADMIN_FULLNAME", DEFAULT_FULL_NAME)
            );
        }

        private static String getEnvOrDefault(String name, String defaultValue) {
            return System.getenv().getOrDefault(name, defaultValue);
        }
    }
}
