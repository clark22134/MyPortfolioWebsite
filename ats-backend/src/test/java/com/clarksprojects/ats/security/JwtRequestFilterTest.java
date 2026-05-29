package com.clarksprojects.ats.security;

import com.clarksprojects.ats.entity.Role;
import com.clarksprojects.ats.entity.User;
import com.clarksprojects.ats.service.CustomUserDetailsService;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JwtRequestFilterTest {

    @Mock CustomUserDetailsService userDetailsService;
    @Mock JwtUtil jwtUtil;
    @Mock CookieUtil cookieUtil;
    @Mock FilterChain chain;

    @InjectMocks
    JwtRequestFilter filter;

    private final User user = User.builder()
            .id(1L).username("alice").password("x").email("a@b.com")
            .fullName("Alice").role(Role.RECRUITER).build();

    @BeforeEach
    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void validCookieToken_authenticates() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(cookieUtil.readAccessToken(request)).thenReturn(Optional.of("valid"));
        when(jwtUtil.extractUsername("valid")).thenReturn("alice");
        when(userDetailsService.loadUserByUsername("alice")).thenReturn(user);
        when(jwtUtil.validateAccessToken("valid", user)).thenReturn(true);

        filter.doFilterInternal(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo("alice");
        verify(chain).doFilter(request, response);
    }

    @Test
    void bearerHeaderToken_authenticatesWhenNoCookie() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer header-token");

        when(cookieUtil.readAccessToken(request)).thenReturn(Optional.empty());
        when(jwtUtil.extractUsername("header-token")).thenReturn("alice");
        when(userDetailsService.loadUserByUsername("alice")).thenReturn(user);
        when(jwtUtil.validateAccessToken("header-token", user)).thenReturn(true);

        filter.doFilterInternal(request, new MockHttpServletResponse(), chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    @Test
    void invalidToken_doesNotAuthenticate() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        when(cookieUtil.readAccessToken(request)).thenReturn(Optional.of("bad"));
        when(jwtUtil.extractUsername("bad")).thenReturn("alice");
        when(userDetailsService.loadUserByUsername("alice")).thenReturn(user);
        when(jwtUtil.validateAccessToken("bad", user)).thenReturn(false);

        filter.doFilterInternal(request, new MockHttpServletResponse(), chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(any(), any());
    }

    @Test
    void exceptionExtractingUsername_swallowed() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        when(cookieUtil.readAccessToken(request)).thenReturn(Optional.of("rot"));
        when(jwtUtil.extractUsername("rot")).thenThrow(new RuntimeException("malformed"));

        filter.doFilterInternal(request, new MockHttpServletResponse(), chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(any(), any());
    }

    @Test
    void noTokenAtAll_callsChainOnly() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        when(cookieUtil.readAccessToken(request)).thenReturn(Optional.empty());

        filter.doFilterInternal(request, new MockHttpServletResponse(), chain);

        verify(chain).doFilter(any(), any());
        verifyNoInteractions(userDetailsService, jwtUtil);
    }
}
