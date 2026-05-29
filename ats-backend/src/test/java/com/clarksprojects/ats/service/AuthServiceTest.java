package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.LoginRequest;
import com.clarksprojects.ats.dto.UserInfoResponse;
import com.clarksprojects.ats.entity.RefreshToken;
import com.clarksprojects.ats.entity.Role;
import com.clarksprojects.ats.entity.User;
import com.clarksprojects.ats.repository.RefreshTokenRepository;
import com.clarksprojects.ats.repository.UserRepository;
import com.clarksprojects.ats.security.CookieUtil;
import com.clarksprojects.ats.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock AuthenticationManager authenticationManager;
    @Mock UserRepository userRepository;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock JwtUtil jwtUtil;
    @Mock CookieUtil cookieUtil;

    @InjectMocks AuthService authService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(1L).username("alice").password("encoded").email("a@b.com")
                .fullName("Alice").role(Role.RECRUITER).enabled(true).build();
        lenient().when(jwtUtil.generateAccessToken(any(), anyString())).thenReturn("access");
        lenient().when(jwtUtil.generateRefreshToken(any())).thenReturn("refresh");
        lenient().when(jwtUtil.getRefreshTokenExpirationMs()).thenReturn(604_800_000L);
    }

    @Test
    void login_success_writesCookiesAndReturnsUserInfo() {
        when(userRepository.findByUsernameIgnoreCase("alice")).thenReturn(Optional.of(user));
        when(refreshTokenRepository.countByUserAndRevokedAtIsNullAndExpiresAtAfter(eq(user), any()))
                .thenReturn(0L);

        UserInfoResponse info = authService.login(new LoginRequest("alice", "pw"),
                new MockHttpServletRequest(), new MockHttpServletResponse());

        assertThat(info.username()).isEqualTo("alice");
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(cookieUtil).writeAccessTokenCookie(any(), eq("access"));
        verify(cookieUtil).writeRefreshTokenCookie(any(), eq("refresh"));
        verify(refreshTokenRepository).save(any(RefreshToken.class));
        verify(userRepository).save(user);
        assertThat(user.getLastLoginAt()).isNotNull();
    }

    @Test
    void login_badCredentials_throws() {
        doThrow(new BadCredentialsException("bad")).when(authenticationManager).authenticate(any());

        assertThatThrownBy(() -> authService.login(new LoginRequest("alice", "wrong"),
                new MockHttpServletRequest(), new MockHttpServletResponse()))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid username or password");
    }

    @Test
    void login_disabledUser_throws() {
        user.setEnabled(false);
        when(userRepository.findByUsernameIgnoreCase("alice")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest("alice", "pw"),
                new MockHttpServletRequest(), new MockHttpServletResponse()))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("disabled");
    }

    @Test
    void login_sessionLimitReached_revokesAllPreviousTokens() {
        when(userRepository.findByUsernameIgnoreCase("alice")).thenReturn(Optional.of(user));
        when(refreshTokenRepository.countByUserAndRevokedAtIsNullAndExpiresAtAfter(eq(user), any()))
                .thenReturn(5L);

        authService.login(new LoginRequest("alice", "pw"),
                new MockHttpServletRequest(), new MockHttpServletResponse());

        verify(refreshTokenRepository).revokeAllForUser(eq(user), any());
    }

    @Test
    void refresh_validToken_rotatesAndReturnsUser() {
        RefreshToken stored = RefreshToken.builder()
                .id(1L).user(user).token("old-refresh")
                .expiresAt(LocalDateTime.now().plusDays(1))
                .createdAt(LocalDateTime.now()).build();
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        when(cookieUtil.readRefreshToken(request)).thenReturn(Optional.of("old-refresh"));
        when(jwtUtil.validateRefreshToken("old-refresh")).thenReturn(true);
        when(refreshTokenRepository.findByToken("old-refresh")).thenReturn(Optional.of(stored));
        when(refreshTokenRepository.countByUserAndRevokedAtIsNullAndExpiresAtAfter(eq(user), any()))
                .thenReturn(0L);

        UserInfoResponse info = authService.refresh(request, response);

        assertThat(info.username()).isEqualTo("alice");
        assertThat(stored.getRevokedAt()).isNotNull();  // old token rotated
        verify(cookieUtil).writeRefreshTokenCookie(eq(response), eq("refresh"));
    }

    @Test
    void refresh_missingCookie_throws() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        when(cookieUtil.readRefreshToken(request)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh(request, new MockHttpServletResponse()))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Missing refresh token");
    }

    @Test
    void refresh_invalidJwt_throws() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        when(cookieUtil.readRefreshToken(request)).thenReturn(Optional.of("rot"));
        when(jwtUtil.validateRefreshToken("rot")).thenReturn(false);

        assertThatThrownBy(() -> authService.refresh(request, new MockHttpServletResponse()))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void refresh_unknownToken_throws() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        when(cookieUtil.readRefreshToken(request)).thenReturn(Optional.of("rot"));
        when(jwtUtil.validateRefreshToken("rot")).thenReturn(true);
        when(refreshTokenRepository.findByToken("rot")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh(request, new MockHttpServletResponse()))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void refresh_revokedToken_throws() {
        RefreshToken stored = RefreshToken.builder()
                .user(user).token("old").revokedAt(LocalDateTime.now().minusMinutes(1))
                .expiresAt(LocalDateTime.now().plusDays(1))
                .createdAt(LocalDateTime.now()).build();
        MockHttpServletRequest request = new MockHttpServletRequest();
        when(cookieUtil.readRefreshToken(request)).thenReturn(Optional.of("old"));
        when(jwtUtil.validateRefreshToken("old")).thenReturn(true);
        when(refreshTokenRepository.findByToken("old")).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> authService.refresh(request, new MockHttpServletResponse()))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void logout_revokesTokenAndClearsCookies() {
        RefreshToken stored = RefreshToken.builder()
                .user(user).token("old").expiresAt(LocalDateTime.now().plusDays(1))
                .createdAt(LocalDateTime.now()).build();
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        when(cookieUtil.readRefreshToken(request)).thenReturn(Optional.of("old"));
        when(refreshTokenRepository.findByToken("old")).thenReturn(Optional.of(stored));

        authService.logout(request, response);

        assertThat(stored.getRevokedAt()).isNotNull();
        verify(cookieUtil).clearAuthCookies(response);
    }

    @Test
    void logout_noCookie_stillClears() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        when(cookieUtil.readRefreshToken(request)).thenReturn(Optional.empty());

        MockHttpServletResponse response = new MockHttpServletResponse();
        authService.logout(request, response);

        verify(cookieUtil).clearAuthCookies(response);
        verifyNoMoreInteractions(refreshTokenRepository);
    }
}
