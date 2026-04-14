package com.portfolio.backend.repository;

import com.portfolio.backend.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class UserRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private UserRepository userRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setPassword("encodedPassword123");
        testUser.setEmail("test@example.com");
        testUser.setFullName("Test User");
    }

    @Test
    void findByUsername_WithExistingUser_ShouldReturnUser() {
        // Arrange
        entityManager.persist(testUser);
        entityManager.flush();

        // Act
        Optional<User> foundUser = userRepository.findByUsername("testuser");

        // Assert
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getUsername()).isEqualTo("testuser");
        assertThat(foundUser.get().getEmail()).isEqualTo("test@example.com");
        assertThat(foundUser.get().getFullName()).isEqualTo("Test User");
    }

    @Test
    void findByUsername_WithNonExistingUser_ShouldReturnEmpty() {
        // Act
        Optional<User> foundUser = userRepository.findByUsername("nonexistent");

        // Assert
        assertThat(foundUser).isEmpty();
    }

    @Test
    void existsByUsername_WithExistingUser_ShouldReturnTrue() {
        // Arrange
        entityManager.persist(testUser);
        entityManager.flush();

        // Act
        boolean exists = userRepository.existsByUsername("testuser");

        // Assert
        assertThat(exists).isTrue();
    }

    @Test
    void existsByUsername_WithNonExistingUser_ShouldReturnFalse() {
        // Act
        boolean exists = userRepository.existsByUsername("nonexistent");

        // Assert
        assertThat(exists).isFalse();
    }

    @Test
    void save_ShouldPersistUser() {
        // Act
        User savedUser = userRepository.save(testUser);

        // Assert
        assertThat(savedUser.getId()).isNotNull();
        assertThat(savedUser.getUsername()).isEqualTo("testuser");
        assertThat(savedUser.getPassword()).isEqualTo("encodedPassword123");
        
        User foundUser = entityManager.find(User.class, savedUser.getId());
        assertThat(foundUser).isNotNull();
        assertThat(foundUser.getUsername()).isEqualTo("testuser");
    }

    @Test
    void findById_WithValidId_ShouldReturnUser() {
        // Arrange
        User persistedUser = entityManager.persist(testUser);
        entityManager.flush();

        // Act
        Optional<User> foundUser = userRepository.findById(persistedUser.getId());

        // Assert
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getUsername()).isEqualTo("testuser");
        assertThat(foundUser.get().getEmail()).isEqualTo("test@example.com");
    }

    @Test
    void findById_WithInvalidId_ShouldReturnEmpty() {
        // Act
        Optional<User> foundUser = userRepository.findById(999L);

        // Assert
        assertThat(foundUser).isEmpty();
    }

    @Test
    void deleteById_ShouldRemoveUser() {
        // Arrange
        User persistedUser = entityManager.persist(testUser);
        entityManager.flush();
        Long userId = persistedUser.getId();

        // Act
        userRepository.deleteById(userId);
        entityManager.flush();

        // Assert
        Optional<User> deletedUser = userRepository.findById(userId);
        assertThat(deletedUser).isEmpty();
    }

    @Test
    void update_ShouldModifyUser() {
        // Arrange
        User persistedUser = entityManager.persist(testUser);
        entityManager.flush();
        Long userId = persistedUser.getId();

        // Act
        persistedUser.setEmail("updated@example.com");
        persistedUser.setFullName("Updated User");
        userRepository.save(persistedUser);
        entityManager.flush();
        entityManager.clear(); // Clear persistence context

        // Assert
        Optional<User> updatedUser = userRepository.findById(userId);
        assertThat(updatedUser).isPresent();
        assertThat(updatedUser.get().getEmail()).isEqualTo("updated@example.com");
        assertThat(updatedUser.get().getFullName()).isEqualTo("Updated User");
    }

    @Test
    void save_WithDuplicateUsername_ShouldFail() {
        // Arrange
        entityManager.persist(testUser);
        entityManager.flush();

        User duplicateUser = new User();
        duplicateUser.setUsername("testuser"); // Same username
        duplicateUser.setPassword("anotherPassword");
        duplicateUser.setEmail("another@example.com");

        // Act & Assert
        try {
            userRepository.save(duplicateUser);
            entityManager.flush();
            // If we reach here, the test should fail
            assertThat(false).isTrue();
        } catch (Exception e) {
            // Expected - username should be unique
            assertThat(e).isNotNull();
        }
    }
}
