package com.clarksprojects.ats.security;

import com.clarksprojects.ats.entity.Role;
import com.clarksprojects.ats.entity.User;
import com.clarksprojects.ats.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CurrentUserServiceTest {

    @Mock
    UserRepository userRepository;

    @InjectMocks
    CurrentUserService currentUserService;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void noAuthentication_returnsEmpty() {
        assertThat(currentUserService.currentUser()).isEmpty();
        assertThat(currentUserService.currentUsername()).isEmpty();
    }

    @Test
    void userPrincipal_returnsUserDirectly() {
        User user = User.builder().id(1L).username("alice").password("x").email("a@b.com")
                .fullName("Alice").role(Role.RECRUITER).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));

        assertThat(currentUserService.currentUser()).contains(user);
        assertThat(currentUserService.currentUsername()).contains("alice");
    }

    @Test
    void stringPrincipal_lookupByUsername() {
        User user = User.builder().id(2L).username("bob").password("x").email("b@b.com")
                .fullName("Bob").role(Role.ADMIN).build();
        when(userRepository.findByUsernameIgnoreCase("bob")).thenReturn(Optional.of(user));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("bob", null, java.util.List.of()));

        assertThat(currentUserService.currentUser()).contains(user);
    }

    @Test
    void anonymousPrincipal_returnsEmpty() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("anonymousUser", null, java.util.List.of()));
        assertThat(currentUserService.currentUser()).isEmpty();
    }
}
