package com.clarksprojects.ats.controller;

import com.clarksprojects.ats.security.CookieUtil;
import com.clarksprojects.ats.security.CurrentUserService;
import com.clarksprojects.ats.security.JwtRequestFilter;
import com.clarksprojects.ats.security.JwtUtil;
import com.clarksprojects.ats.service.CustomUserDetailsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.mockito.Mockito;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Test wiring for {@code @WebMvcTest} slices: provides no-op stubs for the
 * security infrastructure so the slice can boot {@code SecurityConfig} without
 * starting the full Spring context.
 */
@TestConfiguration
public class ControllerTestSupport {

    /** A pass-through filter so the chain doesn't try to validate JWT cookies. */
    @Bean
    @Primary
    public JwtRequestFilter jwtRequestFilter() {
        return new JwtRequestFilter(
                Mockito.mock(CustomUserDetailsService.class),
                Mockito.mock(JwtUtil.class),
                Mockito.mock(CookieUtil.class)) {
            @Override
            protected void doFilterInternal(HttpServletRequest request,
                                            HttpServletResponse response,
                                            FilterChain chain) throws java.io.IOException, jakarta.servlet.ServletException {
                chain.doFilter(request, response);
            }
        };
    }

    @Bean
    public CustomUserDetailsService customUserDetailsService() {
        return Mockito.mock(CustomUserDetailsService.class);
    }

    @Bean
    public JwtUtil jwtUtil() {
        return Mockito.mock(JwtUtil.class);
    }

    @Bean
    public CookieUtil cookieUtil() {
        return Mockito.mock(CookieUtil.class);
    }

    @Bean
    public CurrentUserService currentUserService() {
        return Mockito.mock(CurrentUserService.class);
    }
}
