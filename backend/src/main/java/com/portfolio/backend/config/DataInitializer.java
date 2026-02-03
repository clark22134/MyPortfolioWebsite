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
        updateLegacyProjects();
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

    private void updateLegacyProjects() {
        projectRepository.findByTitle("Portfolio Website").ifPresent(this::updateToSecureCloudProject);
    }

    private void updateToSecureCloudProject(Project project) {
        project.setTitle("SecureCloud DevOps Platform");
        project.setDescription("An enterprise-grade DevSecOps automation platform integrating AI-powered threat detection, automated CI/CD pipelines, and cloud infrastructure management. Features include real-time security scanning with Trivy, automated Terraform deployments to AWS ECS/Lambda, GitHub Actions workflows, and LLM-powered incident response analysis using Python and HuggingFace transformers.");
        project.setTechnologies(List.of(
                "Angular", "Spring Boot", "Python", "AWS (ECS, Lambda, S3, CloudWatch)",
                "Terraform", "GitHub Actions", "Docker", "SonarQube", "PostgreSQL",
                "LLMs", "HuggingFace"
        ));
        project.setGithubUrl("https://github.com/clark22134");
        project.setStartDate(LocalDate.of(2024, 1, 1));
        project.setEndDate(LocalDate.of(2024, 6, 30));
        project.setFeatured(true);
        projectRepository.save(project);
        log.debug("Updated legacy project to SecureCloud DevOps Platform");
    }

    private void initializeSampleProjects() {
        if (projectRepository.count() > 0) {
            return;
        }

        log.info("Initializing sample projects");

        createProject(
                "E-Commerce Platform",
                "A full-stack e-commerce application built with Angular and Spring Boot, featuring user authentication, product management, shopping cart, and payment integration.",
                List.of("Angular", "Spring Boot", "PostgreSQL", "JWT", "Stripe API"),
                LocalDate.of(2023, 1, 1),
                LocalDate.of(2023, 6, 30)
        );

        createProject(
                "Task Management System",
                "A modern task management application with real-time updates, team collaboration features, and advanced filtering capabilities.",
                List.of("Angular", "Spring Boot", "WebSocket", "MongoDB", "Docker"),
                LocalDate.of(2023, 7, 1),
                LocalDate.of(2023, 12, 31)
        );

        createProject(
                "SecureCloud DevOps Platform",
                "An enterprise-grade DevSecOps automation platform integrating AI-powered threat detection, automated CI/CD pipelines, and cloud infrastructure management. Features include real-time security scanning with Trivy, automated Terraform deployments to AWS ECS/Lambda, GitHub Actions workflows, and LLM-powered incident response analysis using Python and HuggingFace transformers.",
                List.of("Angular", "Spring Boot", "Python", "AWS (ECS, Lambda, S3, CloudWatch)",
                        "Terraform", "GitHub Actions", "Docker", "SonarQube", "PostgreSQL",
                        "LLMs", "HuggingFace"),
                LocalDate.of(2024, 1, 1),
                LocalDate.of(2024, 6, 30)
        );
    }

    private void createProject(String title, String description, List<String> technologies,
                               LocalDate startDate, LocalDate endDate) {
        Project project = new Project();
        project.setTitle(title);
        project.setDescription(description);
        project.setTechnologies(technologies);
        project.setGithubUrl("https://github.com/clark22134");
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
