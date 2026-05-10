package com.portfolio.backend.config;

import com.portfolio.backend.entity.Project;
import com.portfolio.backend.entity.User;
import com.portfolio.backend.repository.ProjectRepository;
import com.portfolio.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DataInitializerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProjectRepository projectRepository;

    private PasswordEncoder passwordEncoder;

    private DataInitializer initializer;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        initializer = new DataInitializer(userRepository, projectRepository, passwordEncoder);
    }

    @Test
    void run_whenAdminUserDoesNotExist_createsNewUser() throws Exception {
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.empty());
        when(projectRepository.findByTitle(anyString())).thenReturn(Optional.empty());

        initializer.run();

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User saved = userCaptor.getValue();
        assertThat(saved.getUsername()).isNotBlank();
        assertThat(saved.getEmail()).isNotBlank();
        assertThat(saved.getFullName()).isNotBlank();
        // Password should be encoded
        assertThat(saved.getPassword()).isNotBlank();
    }

    @Test
    void run_whenAdminUserAlreadyExists_updatesUser() throws Exception {
        User existing = new User();
        existing.setUsername("admin");
        existing.setPassword("old-hash");
        existing.setEmail("old@example.com");
        existing.setFullName("Old Name");

        when(userRepository.findByUsername(anyString())).thenReturn(Optional.of(existing));
        when(projectRepository.findByTitle(anyString())).thenReturn(Optional.empty());

        initializer.run();

        // Should save the updated user (not create a new one)
        verify(userRepository).save(existing);
    }

    @Test
    void run_removesLegacyProjectsWhenPresent() throws Exception {
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.empty());

        Project legacyProject = new Project();
        legacyProject.setTitle("SecureCloud DevOps Platform");

        when(projectRepository.findByTitle("SecureCloud DevOps Platform"))
                .thenReturn(Optional.of(legacyProject));
        when(projectRepository.findByTitle("Portfolio Website"))
                .thenReturn(Optional.empty());
        when(projectRepository.findByTitle("Task Management System"))
                .thenReturn(Optional.empty());
        when(projectRepository.findByTitle("E-Commerce Platform"))
                .thenReturn(Optional.empty());
        when(projectRepository.findByTitle("Applicant Tracking System"))
                .thenReturn(Optional.empty());

        initializer.run();

        verify(projectRepository).delete(legacyProject);
    }

    @Test
    void run_updatesEcommercePlatformWhenPresent() throws Exception {
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.empty());

        Project ecommerce = new Project();
        ecommerce.setTitle("E-Commerce Platform");

        when(projectRepository.findByTitle("SecureCloud DevOps Platform")).thenReturn(Optional.empty());
        when(projectRepository.findByTitle("Portfolio Website")).thenReturn(Optional.empty());
        when(projectRepository.findByTitle("Task Management System")).thenReturn(Optional.empty());
        when(projectRepository.findByTitle("E-Commerce Platform")).thenReturn(Optional.of(ecommerce));
        when(projectRepository.findByTitle("Applicant Tracking System")).thenReturn(Optional.empty());

        initializer.run();

        // Should save the updated project with demo URL
        verify(projectRepository).save(ecommerce);
        assertThat(ecommerce.getDemoUrl()).isEqualTo("https://shop.clarkfoster.com");
    }

    @Test
    void run_createsEcommercePlatformWhenAbsent() throws Exception {
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.empty());
        when(projectRepository.findByTitle(anyString())).thenReturn(Optional.empty());

        initializer.run();

        // Should save at least 2 projects (E-Commerce + ATS)
        verify(projectRepository, atLeast(2)).save(any(Project.class));
    }

    @Test
    void run_doesNotCreateEcommercePlatformWhenAlreadyExists() throws Exception {
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.empty());

        Project ecommerce = new Project();
        when(projectRepository.findByTitle("E-Commerce Platform")).thenReturn(Optional.of(ecommerce));
        when(projectRepository.findByTitle(argThat(t -> !t.equals("E-Commerce Platform"))))
                .thenReturn(Optional.empty());

        initializer.run();

        // No new E-Commerce project should be created (only updated if present)
        // save is called once for the update, not again for creation
        verify(projectRepository, times(1)).save(ecommerce);
    }
}
