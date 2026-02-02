package com.portfolio.backend.config;

import com.portfolio.backend.entity.Project;
import com.portfolio.backend.entity.User;
import com.portfolio.backend.repository.ProjectRepository;
import com.portfolio.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Arrays;

@Component
public class DataInitializer implements CommandLineRunner {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ProjectRepository projectRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Override
    public void run(String... args) throws Exception {
        // Create admin user from environment variables
        String adminUsername = System.getenv().getOrDefault("ADMIN_USERNAME", "admin");
        String adminPassword = System.getenv().getOrDefault("ADMIN_PASSWORD", "defaultPassword");
        String adminEmail = System.getenv().getOrDefault("ADMIN_EMAIL", "admin@clarkfoster.com");
        String adminFullName = System.getenv().getOrDefault("ADMIN_FULLNAME", "Clark Foster");
        
        if (!userRepository.existsByUsername(adminUsername)) {
            User user = new User();
            user.setUsername(adminUsername);
            user.setPassword(passwordEncoder.encode(adminPassword));
            user.setEmail(adminEmail);
            user.setFullName(adminFullName);
            userRepository.save(user);
        }
        
        // Create sample projects
        if (projectRepository.count() == 0) {
            Project project1 = new Project();
            project1.setTitle("E-Commerce Platform");
            project1.setDescription("A full-stack e-commerce application built with Angular and Spring Boot, featuring user authentication, product management, shopping cart, and payment integration.");
            project1.setTechnologies(Arrays.asList("Angular", "Spring Boot", "PostgreSQL", "JWT", "Stripe API"));
            project1.setGithubUrl("https://github.com/clark22134");
            project1.setStartDate(LocalDate.of(2023, 1, 1));
            project1.setEndDate(LocalDate.of(2023, 6, 30));
            project1.setFeatured(true);
            projectRepository.save(project1);
            
            Project project2 = new Project();
            project2.setTitle("Task Management System");
            project2.setDescription("A modern task management application with real-time updates, team collaboration features, and advanced filtering capabilities.");
            project2.setTechnologies(Arrays.asList("Angular", "Spring Boot", "WebSocket", "MongoDB", "Docker"));
            project2.setGithubUrl("https://github.com/clark22134");
            project2.setStartDate(LocalDate.of(2023, 7, 1));
            project2.setEndDate(LocalDate.of(2023, 12, 31));
            project2.setFeatured(true);
            projectRepository.save(project2);
            
            Project project3 = new Project();
            project3.setTitle("SecureCloud DevOps Platform");
            project3.setDescription("An enterprise-grade DevSecOps automation platform integrating AI-powered threat detection, automated CI/CD pipelines, and cloud infrastructure management. Features include real-time security scanning with Trivy, automated Terraform deployments to AWS ECS/Lambda, GitHub Actions workflows, and LLM-powered incident response analysis using Python and HuggingFace transformers.");
            project3.setTechnologies(Arrays.asList("Angular", "Spring Boot", "Python", "AWS (ECS, Lambda, S3, CloudWatch)", "Terraform", "GitHub Actions", "Docker", "SonarQube", "PostgreSQL", "LLMs", "HuggingFace"));
            project3.setGithubUrl("https://github.com/clark22134");
            project3.setStartDate(LocalDate.of(2024, 1, 1));
            project3.setEndDate(LocalDate.of(2024, 6, 30));
            project3.setFeatured(true);
            projectRepository.save(project3);
        }
    }
}
