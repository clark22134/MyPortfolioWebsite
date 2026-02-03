package com.portfolio.backend.security;

import com.portfolio.backend.service.CustomUserDetailsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

@Component
public class JwtRequestFilter extends OncePerRequestFilter {
    
    @Autowired
    private CustomUserDetailsService userDetailsService;
    
    @Autowired
    private JwtUtil jwtUtil;
    
    @Autowired
    private CookieUtil cookieUtil;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        
        String username = null;
        String jwt = null;
        
        // First, try to get token from HTTP-only cookie (preferred)
        Optional<String> cookieToken = cookieUtil.getAccessTokenFromCookies(request);
        if (cookieToken.isPresent()) {
            jwt = cookieToken.get();
            try {
                username = jwtUtil.extractUsername(jwt);
            } catch (Exception e) {
                // Invalid token in cookie
            }
        }
        
        // Fallback: check Authorization header (for API clients/testing)
        if (jwt == null) {
            final String authorizationHeader = request.getHeader("Authorization");
            if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
                jwt = authorizationHeader.substring(7);
                try {
                    username = jwtUtil.extractUsername(jwt);
                } catch (Exception e) {
                    // Invalid token
                }
            }
        }
        
        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);
            
            if (jwtUtil.validateToken(jwt, userDetails)) {
                UsernamePasswordAuthenticationToken authenticationToken =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                authenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authenticationToken);
            }
        }
        
        chain.doFilter(request, response);
    }
}
