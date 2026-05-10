package com.portfolio.backend.security;

import com.portfolio.backend.service.CustomUserDetailsService;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JwtRequestFilterTest {

    @Mock
    private CustomUserDetailsService userDetailsService;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private CookieUtil cookieUtil;

    @Mock
    private FilterChain filterChain;

    private JwtRequestFilter filter;
    private UserDetails testUser;

    @BeforeEach
    void setUp() {
        filter = new JwtRequestFilter(userDetailsService, jwtUtil, cookieUtil);
        testUser = User.withUsername("alice")
                .password("pass")
                .authorities(List.of())
                .build();
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void doFilterInternal_validTokenFromCookie_authenticatesUser() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(cookieUtil.getAccessTokenFromCookies(any())).thenReturn(Optional.of("valid-jwt"));
        when(jwtUtil.extractUsername("valid-jwt")).thenReturn("alice");
        when(userDetailsService.loadUserByUsername("alice")).thenReturn(testUser);
        when(jwtUtil.validateToken("valid-jwt", testUser)).thenReturn(true);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo("alice");
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilterInternal_validTokenFromBearerHeader_authenticatesUser() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer header-jwt");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(cookieUtil.getAccessTokenFromCookies(any())).thenReturn(Optional.empty());
        when(jwtUtil.extractUsername("header-jwt")).thenReturn("bob");
        when(userDetailsService.loadUserByUsername("bob")).thenReturn(testUser);
        when(jwtUtil.validateToken("header-jwt", testUser)).thenReturn(true);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilterInternal_noToken_chainsWithoutAuthentication() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(cookieUtil.getAccessTokenFromCookies(any())).thenReturn(Optional.empty());

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(jwtUtil, userDetailsService);
    }

    @Test
    void doFilterInternal_authorizationHeaderWithoutBearerPrefix_noAuthentication() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Basic dXNlcjpwYXNz");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(cookieUtil.getAccessTokenFromCookies(any())).thenReturn(Optional.empty());

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verifyNoInteractions(jwtUtil, userDetailsService);
    }

    @Test
    void doFilterInternal_tokenValidationFails_noAuthentication() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(cookieUtil.getAccessTokenFromCookies(any())).thenReturn(Optional.of("bad-jwt"));
        when(jwtUtil.extractUsername("bad-jwt")).thenReturn("alice");
        when(userDetailsService.loadUserByUsername("alice")).thenReturn(testUser);
        when(jwtUtil.validateToken("bad-jwt", testUser)).thenReturn(false);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilterInternal_extractUsernameThrowsException_chainsWithoutAuthentication() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(cookieUtil.getAccessTokenFromCookies(any())).thenReturn(Optional.of("malformed-jwt"));
        when(jwtUtil.extractUsername("malformed-jwt")).thenThrow(new RuntimeException("Invalid JWT"));

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilterInternal_extractUsernameReturnsNull_skipsAuthentication() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(cookieUtil.getAccessTokenFromCookies(any())).thenReturn(Optional.of("null-user-jwt"));
        when(jwtUtil.extractUsername("null-user-jwt")).thenReturn(null);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verifyNoInteractions(userDetailsService);
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilterInternal_alreadyAuthenticated_skipsAuthentication() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        // Pre-populate authentication
        UsernamePasswordAuthenticationToken existing = new UsernamePasswordAuthenticationToken(
                testUser, null, testUser.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(existing);

        when(cookieUtil.getAccessTokenFromCookies(any())).thenReturn(Optional.of("valid-jwt"));
        when(jwtUtil.extractUsername("valid-jwt")).thenReturn("alice");

        filter.doFilterInternal(request, response, filterChain);

        // Should still call chain but not try to load user again
        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(userDetailsService);
    }
}
