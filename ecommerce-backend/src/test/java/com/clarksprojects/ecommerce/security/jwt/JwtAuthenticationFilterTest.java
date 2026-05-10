package com.clarksprojects.ecommerce.security.jwt;

import com.clarksprojects.ecommerce.security.CookieUtil;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import jakarta.servlet.http.Cookie;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private UserDetailsService userDetailsService;

    @Mock
    private FilterChain filterChain;

    private JwtAuthenticationFilter filter;
    private UserDetails testUser;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter(jwtUtils, userDetailsService);
        testUser = User.withUsername("user@example.com")
                .password("pw")
                .authorities(Collections.emptyList())
                .build();
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void doFilterInternal_withValidCookieToken_authenticatesUser() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie(CookieUtil.JWT_COOKIE_NAME, "cookie-token"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(jwtUtils.validateToken("cookie-token")).thenReturn(true);
        when(jwtUtils.getEmailFromToken("cookie-token")).thenReturn("user@example.com");
        when(userDetailsService.loadUserByUsername("user@example.com")).thenReturn(testUser);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName())
                .isEqualTo("user@example.com");
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilterInternal_withValidBearerHeader_authenticatesUser() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer header-token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(jwtUtils.validateToken("header-token")).thenReturn(true);
        when(jwtUtils.getEmailFromToken("header-token")).thenReturn("user@example.com");
        when(userDetailsService.loadUserByUsername("user@example.com")).thenReturn(testUser);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilterInternal_withNoCookiesAndNoHeader_chainsWithoutAuthentication() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verifyNoInteractions(jwtUtils, userDetailsService);
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilterInternal_withInvalidToken_doesNotAuthenticate() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer invalid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(jwtUtils.validateToken("invalid-token")).thenReturn(false);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilterInternal_userNotFoundAfterTokenValidation_clearsContextAndChains() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer stale-token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(jwtUtils.validateToken("stale-token")).thenReturn(true);
        when(jwtUtils.getEmailFromToken("stale-token")).thenReturn("deleted@example.com");
        when(userDetailsService.loadUserByUsername("deleted@example.com"))
                .thenThrow(new UsernameNotFoundException("User not found"));

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilterInternal_noCookiesButValidBearerHeader_usesFallback() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        // No cookies set — no getCookies() call returns null by default in MockHttpServletRequest
        request.addHeader("Authorization", "Bearer fallback-token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(jwtUtils.validateToken("fallback-token")).thenReturn(true);
        when(jwtUtils.getEmailFromToken("fallback-token")).thenReturn("user@example.com");
        when(userDetailsService.loadUserByUsername("user@example.com")).thenReturn(testUser);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    @Test
    void doFilterInternal_cookieWithDifferentName_fallsBackToHeader() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        // A cookie with a different name should be ignored
        request.setCookies(new Cookie("some_other_cookie", "irrelevant"));
        request.addHeader("Authorization", "Bearer header-only");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(jwtUtils.validateToken("header-only")).thenReturn(true);
        when(jwtUtils.getEmailFromToken("header-only")).thenReturn("user@example.com");
        when(userDetailsService.loadUserByUsername("user@example.com")).thenReturn(testUser);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }
}
