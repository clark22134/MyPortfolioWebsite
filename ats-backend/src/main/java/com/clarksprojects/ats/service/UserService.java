package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.CreateUserRequest;
import com.clarksprojects.ats.dto.UpdateUserRequest;
import com.clarksprojects.ats.dto.UserInfoResponse;
import com.clarksprojects.ats.entity.Role;
import com.clarksprojects.ats.entity.User;
import com.clarksprojects.ats.exception.ResourceNotFoundException;
import com.clarksprojects.ats.repository.RefreshTokenRepository;
import com.clarksprojects.ats.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UserInfoResponse> listAll() {
        return userRepository.findAllByOrderByUsernameAsc().stream()
                .map(UserInfoResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserInfoResponse> listByRole(Role role) {
        return userRepository.findByRoleOrderByUsernameAsc(role).stream()
                .map(UserInfoResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserInfoResponse get(Long id) {
        return UserInfoResponse.from(findOrThrow(id));
    }

    @Transactional
    public UserInfoResponse create(CreateUserRequest request) {
        if (userRepository.existsByUsernameIgnoreCase(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists");
        }
        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail())
                .fullName(request.getFullName())
                .role(request.getRole())
                .enabled(true)
                .createdAt(LocalDateTime.now())
                .build();
        log.info("User created: username={}, role={}", user.getUsername(), user.getRole());
        return UserInfoResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserInfoResponse update(Long id, UpdateUserRequest request) {
        User user = findOrThrow(id);
        user.setEmail(request.getEmail());
        user.setFullName(request.getFullName());
        user.setRole(request.getRole());
        user.setEnabled(request.getEnabled());
        log.info("User updated: id={}", id);
        return UserInfoResponse.from(userRepository.save(user));
    }

    @Transactional
    public void delete(Long id) {
        User user = findOrThrow(id);
        refreshTokenRepository.revokeAllForUser(user, LocalDateTime.now());
        userRepository.delete(user);
        log.info("User deleted: id={}", id);
    }

    private User findOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
    }
}
