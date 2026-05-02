package com.clarksprojects.ecommerce.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Adds an edge-cacheable Cache-Control header to public product catalog reads
 * so CloudFront can absorb most traffic and Lambda only handles cache misses.
 *
 * <p>Scope is intentionally narrow: only GET requests under /api/products and
 * /api/product-category that do not carry credentials. Any request with an
 * Authorization header or session cookie is left alone so per-user data is
 * never cached at the edge.
 */
@Component
public class ProductCacheControlFilter extends OncePerRequestFilter {

    private static final String CACHE_HEADER = "public, max-age=60, s-maxage=300";

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        filterChain.doFilter(request, response);

        if (!"GET".equalsIgnoreCase(request.getMethod())) {
            return;
        }
        String path = request.getRequestURI();
        if (path == null) {
            return;
        }
        if (!(path.startsWith("/api/products") || path.startsWith("/api/product-category"))) {
            return;
        }
        if (request.getHeader("Authorization") != null) {
            return;
        }
        if (response.getStatus() != HttpServletResponse.SC_OK) {
            return;
        }
        // Don't override anything an upstream component already set.
        if (response.getHeader("Cache-Control") != null) {
            return;
        }
        response.setHeader("Cache-Control", CACHE_HEADER);
    }
}
