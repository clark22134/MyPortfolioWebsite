package com.clarksprojects.ats.service;

import com.clarksprojects.ats.entity.Role;
import com.clarksprojects.ats.entity.User;
import com.clarksprojects.ats.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DemoUserInitializerTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;

    @InjectMocks DemoUserInitializer initializer;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(initializer, "enabled", true);
        ReflectionTestUtils.setField(initializer, "adminPassword", "admin123");
        ReflectionTestUtils.setField(initializer, "recruiterPassword", "recruiter123");
        ReflectionTestUtils.setField(initializer, "managerPassword", "manager123");
    }

    @Test
    void run_disabled_skipsSeed() {
        ReflectionTestUtils.setField(initializer, "enabled", false);
        initializer.run(null);
        verifyNoInteractions(userRepository, passwordEncoder);
    }

    @Test
    void run_emptyDatabase_seedsThreeUsers() {
        when(userRepository.existsByUsernameIgnoreCase(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("HASH");

        initializer.run(null);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, times(3)).save(captor.capture());
        List<User> saved = captor.getAllValues();
        assertThat(saved).extracting(User::getUsername).containsExactly("admin", "recruiter", "manager");
        assertThat(saved).extracting(User::getRole).containsExactly(Role.ADMIN, Role.RECRUITER, Role.HIRING_MANAGER);
        assertThat(saved).allMatch(u -> "HASH".equals(u.getPassword()));
    }

    @Test
    void run_existingUsers_skipsThem() {
        when(userRepository.existsByUsernameIgnoreCase("admin")).thenReturn(true);
        when(userRepository.existsByUsernameIgnoreCase("recruiter")).thenReturn(false);
        when(userRepository.existsByUsernameIgnoreCase("manager")).thenReturn(true);
        when(passwordEncoder.encode(any())).thenReturn("HASH");

        initializer.run(null);

        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void run_blankPasswords_skipsSeedAndNeverHashes() {
        ReflectionTestUtils.setField(initializer, "adminPassword", "");
        ReflectionTestUtils.setField(initializer, "recruiterPassword", "   ");
        ReflectionTestUtils.setField(initializer, "managerPassword", null);

        initializer.run(null);

        verify(userRepository, never()).save(any(User.class));
        verifyNoInteractions(passwordEncoder);
    }
}
