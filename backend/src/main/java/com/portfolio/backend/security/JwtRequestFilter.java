package com.portfolio.backend.security;

import com.portfolio.backend.service.CustomUserDetailsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

/**
 * JWT authentication filter for processing requests.
 * Extracts JWT from cookies or Authorization header and validates it.
 */
@Component
public class JwtRequestFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtRequestFilter.class);
    private static final String BEARER_PREFIX = "Bearer ";

    private final CustomUserDetailsService userDetailsService;
    private final JwtUtil jwtUtil;
    private final CookieUtil cookieUtil;

    public JwtRequestFilter(
            CustomUserDetailsService userDetailsService,
            JwtUtil jwtUtil,
            CookieUtil cookieUtil) {
        this.userDetailsService = userDetailsService;
        this.jwtUtil = jwtUtil;
        this.cookieUtil = cookieUtil;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {

        Optional<String> jwtOptional = extractJwt(request);

        jwtOptional.ifPresent(jwt -> authenticateIfValid(jwt, request));

        chain.doFilter(request, response);
    }

    private Optional<String> extractJwt(HttpServletRequest request) {
        // First, try to get token from HTTP-only cookie (preferred)
        Optional<String> cookieToken = cookieUtil.getAccessTokenFromCookies(request);
        if (cookieToken.isPresent()) {
            return cookieToken;
        }

        // Fallback: check Authorization header (for API clients/testing)
        return extractJwtFromHeader(request);
    }

    private Optional<String> extractJwtFromHeader(HttpServletRequest request) {
        String authorizationHeader = request.getHeader("Authorization");
        if (authorizationHeader != null && authorizationHeader.startsWith(BEARER_PREFIX)) {
            return Optional.of(authorizationHeader.substring(BEARER_PREFIX.length()));
        }
        return Optional.empty();
    }

    private void authenticateIfValid(String jwt, HttpServletRequest request) {
        try {
            String username = jwtUtil.extractUsername(jwt);

            if (username != null && isNotAlreadyAuthenticated()) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                if (jwtUtil.validateToken(jwt, userDetails)) {
                    setAuthentication(userDetails, request);
                }
            }
        } catch (Exception e) {
            log.debug("JWT validation failed: {}", e.getMessage());
        }
    }

    private boolean isNotAlreadyAuthenticated() {
        return SecurityContextHolder.getContext().getAuthentication() == null;
    }

    private void setAuthentication(UserDetails userDetails, HttpServletRequest request) {
        UsernamePasswordAuthenticationToken authenticationToken =
                new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );
        authenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authenticationToken);
    }
}
