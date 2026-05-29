package com.clarksprojects.ats.service;

import com.clarksprojects.ats.entity.Role;
import com.clarksprojects.ats.entity.User;
import com.clarksprojects.ats.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomUserDetailsServiceTest {

    @Mock UserRepository userRepository;

    @InjectMocks CustomUserDetailsService service;

    @Test
    void loadUserByUsername_found_returnsUser() {
        User user = User.builder().id(1L).username("alice").password("x").email("a@b.com")
                .fullName("Alice").role(Role.RECRUITER).build();
        when(userRepository.findByUsernameIgnoreCase("alice")).thenReturn(Optional.of(user));

        assertThat(service.loadUserByUsername("alice").getUsername()).isEqualTo("alice");
        assertThat(service.loadUserByUsername("alice").getAuthorities())
                .extracting(Object::toString).containsExactly("ROLE_RECRUITER");
    }

    @Test
    void loadUserByUsername_missing_throws() {
        when(userRepository.findByUsernameIgnoreCase("nope")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.loadUserByUsername("nope"))
                .isInstanceOf(UsernameNotFoundException.class);
    }
}
