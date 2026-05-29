package com.clarksprojects.ats.repository;

import com.clarksprojects.ats.entity.Role;
import com.clarksprojects.ats.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsernameIgnoreCase(String username);
    boolean existsByUsernameIgnoreCase(String username);
    List<User> findAllByOrderByUsernameAsc();
    List<User> findByRoleOrderByUsernameAsc(Role role);
}
