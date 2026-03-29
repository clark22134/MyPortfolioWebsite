package com.portfolio.backend.service;

import com.portfolio.backend.entity.RefreshToken;
import com.portfolio.backend.entity.User;
import com.portfolio.backend.repository.RefreshTokenRepository;
import com.portfolio.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private UserRepository userRepository;

    private RefreshTokenService service;
    private User testUser;

    @BeforeEach
    void setUp() {
        service = new RefreshTokenService(refreshTokenRepository, userRepository, 604800000L, 5);

        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
    }

    @Test
    void createRefreshToken_savesAndReturnsToken() {
        when(refreshTokenRepository.countByUserAndRevokedFalse(testUser)).thenReturn(0L);
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        RefreshToken result = service.createRefreshToken(testUser, "Mozilla/5.0", "127.0.0.1");

        assertThat(result).isNotNull();
        assertThat(result.getToken()).isNotNull();
        assertThat(result.getUser()).isEqualTo(testUser);
        assertThat(result.getUserAgent()).isEqualTo("Mozilla/5.0");
        assertThat(result.getIpAddress()).isEqualTo("127.0.0.1");
        assertThat(result.getExpiryDate()).isAfter(Instant.now());
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void createRefreshToken_revokesAllWhenMaxReached() {
        when(refreshTokenRepository.countByUserAndRevokedFalse(testUser)).thenReturn(5L);
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        service.createRefreshToken(testUser, "Chrome", "192.168.1.1");

        verify(refreshTokenRepository).revokeAllByUser(testUser);
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void createRefreshToken_doesNotRevokeWhenBelowMax() {
        when(refreshTokenRepository.countByUserAndRevokedFalse(testUser)).thenReturn(3L);
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        service.createRefreshToken(testUser, "Chrome", "192.168.1.1");

        verify(refreshTokenRepository, never()).revokeAllByUser(any());
    }

    @Test
    void findByToken_delegatesToRepository() {
        RefreshToken token = new RefreshToken();
        token.setToken("abc-123");
        when(refreshTokenRepository.findByTokenAndRevokedFalse("abc-123")).thenReturn(Optional.of(token));

        Optional<RefreshToken> result = service.findByToken("abc-123");

        assertThat(result).isPresent();
        assertThat(result.get().getToken()).isEqualTo("abc-123");
    }

    @Test
    void findByToken_returnsEmptyForMissing() {
        when(refreshTokenRepository.findByTokenAndRevokedFalse("missing")).thenReturn(Optional.empty());

        Optional<RefreshToken> result = service.findByToken("missing");

        assertThat(result).isEmpty();
    }

    @Test
    void validateRefreshToken_validToken_returnsTrue() {
        RefreshToken token = new RefreshToken();
        token.setRevoked(false);
        token.setExpiryDate(Instant.now().plusSeconds(3600));

        assertThat(service.validateRefreshToken(token)).isTrue();
    }

    @Test
    void validateRefreshToken_nullToken_returnsFalse() {
        assertThat(service.validateRefreshToken(null)).isFalse();
    }

    @Test
    void validateRefreshToken_revokedToken_returnsFalse() {
        RefreshToken token = new RefreshToken();
        token.setRevoked(true);
        token.setExpiryDate(Instant.now().plusSeconds(3600));

        assertThat(service.validateRefreshToken(token)).isFalse();
    }

    @Test
    void validateRefreshToken_expiredToken_returnsFalseAndRevokes() {
        RefreshToken token = new RefreshToken();
        token.setRevoked(false);
        token.setExpiryDate(Instant.now().minusSeconds(3600));

        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.validateRefreshToken(token)).isFalse();
        assertThat(token.isRevoked()).isTrue();
        verify(refreshTokenRepository).save(token);
    }

    @Test
    void revokeToken_setsRevokedAndSaves() {
        RefreshToken token = new RefreshToken();
        token.setRevoked(false);

        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        service.revokeToken(token);

        assertThat(token.isRevoked()).isTrue();
        verify(refreshTokenRepository).save(token);
    }
}
