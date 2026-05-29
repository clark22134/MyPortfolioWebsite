package com.clarksprojects.ats.security;

import com.clarksprojects.ats.entity.User;
import com.clarksprojects.ats.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Single source for "who is the calling user, if any?" so services and the
 * activity log don't all have to deal with SecurityContextHolder directly.
 * Returns empty when there is no authentication (background jobs, tests with
 * security disabled, etc.).
 */
@Component
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserRepository userRepository;

    public Optional<User> currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return Optional.empty();
        Object principal = auth.getPrincipal();
        if (principal instanceof User u) return Optional.of(u);
        if (principal instanceof String name && !"anonymousUser".equals(name)) {
            return userRepository.findByUsernameIgnoreCase(name);
        }
        return Optional.empty();
    }

    public Optional<String> currentUsername() {
        return currentUser().map(User::getUsername);
    }
}
