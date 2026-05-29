package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.CreateUserRequest;
import com.clarksprojects.ats.dto.UpdateUserRequest;
import com.clarksprojects.ats.dto.UserInfoResponse;
import com.clarksprojects.ats.entity.Role;
import com.clarksprojects.ats.entity.User;
import com.clarksprojects.ats.exception.ResourceNotFoundException;
import com.clarksprojects.ats.repository.RefreshTokenRepository;
import com.clarksprojects.ats.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock UserRepository userRepository;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock PasswordEncoder passwordEncoder;

    @InjectMocks UserService userService;

    private final User alice = User.builder()
            .id(1L).username("alice").password("hashed").email("a@b.com")
            .fullName("Alice").role(Role.RECRUITER).enabled(true).build();

    @Test
    void listAll_returnsResponses() {
        when(userRepository.findAllByOrderByUsernameAsc()).thenReturn(List.of(alice));
        List<UserInfoResponse> result = userService.listAll();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).username()).isEqualTo("alice");
    }

    @Test
    void listByRole_filtersOnRole() {
        when(userRepository.findByRoleOrderByUsernameAsc(Role.RECRUITER)).thenReturn(List.of(alice));
        assertThat(userService.listByRole(Role.RECRUITER)).hasSize(1);
    }

    @Test
    void get_existingId_returnsUser() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(alice));
        assertThat(userService.get(1L).username()).isEqualTo("alice");
    }

    @Test
    void get_unknownId_throws() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> userService.get(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void create_newUsername_hashesPasswordAndSaves() {
        CreateUserRequest req = CreateUserRequest.builder()
                .username("bob").password("secret123").email("b@b.com")
                .fullName("Bob").role(Role.HIRING_MANAGER).build();
        when(userRepository.existsByUsernameIgnoreCase("bob")).thenReturn(false);
        when(passwordEncoder.encode("secret123")).thenReturn("HASHED");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(2L);
            return u;
        });

        UserInfoResponse out = userService.create(req);

        assertThat(out.id()).isEqualTo(2L);
        assertThat(out.role()).isEqualTo(Role.HIRING_MANAGER);
    }

    @Test
    void create_duplicateUsername_throws() {
        when(userRepository.existsByUsernameIgnoreCase("alice")).thenReturn(true);
        CreateUserRequest req = CreateUserRequest.builder()
                .username("alice").password("secret123").email("a@b.com")
                .fullName("Alice").role(Role.RECRUITER).build();

        assertThatThrownBy(() -> userService.create(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("exists");
    }

    @Test
    void update_modifiesFieldsAndSaves() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(alice));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateUserRequest req = UpdateUserRequest.builder()
                .email("new@b.com").fullName("Alice Renamed").role(Role.ADMIN).enabled(false).build();

        UserInfoResponse out = userService.update(1L, req);

        assertThat(out.email()).isEqualTo("new@b.com");
        assertThat(out.role()).isEqualTo(Role.ADMIN);
        assertThat(out.enabled()).isFalse();
    }

    @Test
    void delete_revokesRefreshTokensAndDeletes() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(alice));
        userService.delete(1L);
        verify(refreshTokenRepository).revokeAllForUser(eq(alice), any());
        verify(userRepository).delete(alice);
    }
}
