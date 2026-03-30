package com.portfolio.backend.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Optional;

/**
 * Utility class for managing secure HTTP-only cookies for JWT tokens.
 */
@Component
public class CookieUtil {

    public static final String ACCESS_TOKEN_COOKIE = "access_token";
    public static final String REFRESH_TOKEN_COOKIE = "refresh_token";

    @Value("${jwt.access.expiration:900000}")
    private Long accessTokenExpirationMs;

    @Value("${jwt.refresh.expiration:604800000}")
    private Long refreshTokenExpirationMs;

    @Value("${cookie.secure:true}")
    private boolean secureCookie;

    @Value("${cookie.domain:}")
    private String cookieDomain;

    /**
     * Create an HTTP-only secure cookie for the access token.
     */
    public Cookie createAccessTokenCookie(String token) {
        return createSecureCookie(ACCESS_TOKEN_COOKIE, token, (int) (accessTokenExpirationMs / 1000));
    }

    /**
     * Create an HTTP-only secure cookie for the refresh token.
     */
    public Cookie createRefreshTokenCookie(String token) {
        return createSecureCookie(REFRESH_TOKEN_COOKIE, token, (int) (refreshTokenExpirationMs / 1000));
    }

    /**
     * Create a secure HTTP-only cookie.
     */
    private Cookie createSecureCookie(String name, String value, int maxAgeSeconds) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);         // Not accessible via JavaScript
        cookie.setSecure(secureCookie);   // Only sent over HTTPS
        cookie.setPath("/");              // Available for all paths
        cookie.setMaxAge(maxAgeSeconds);
        
        // SameSite attribute (set via response header as Cookie class doesn't support it directly)
        if (cookieDomain != null && !cookieDomain.isEmpty()) {
            cookie.setDomain(cookieDomain);
        }
        
        return cookie;
    }

    /**
     * Add SameSite=Strict attribute to the cookie (must be done via header).
     */
    public void addCookieWithSameSite(HttpServletResponse response, Cookie cookie, String sameSite) {
        StringBuilder cookieHeader = new StringBuilder();
        cookieHeader.append(cookie.getName()).append("=").append(cookie.getValue());
        cookieHeader.append("; Path=").append(cookie.getPath());
        cookieHeader.append("; Max-Age=").append(cookie.getMaxAge());
        
        if (cookie.isHttpOnly()) {
            cookieHeader.append("; HttpOnly");
        }
        if (cookie.getSecure()) {
            cookieHeader.append("; Secure");
        }
        if (cookie.getDomain() != null && !cookie.getDomain().isEmpty()) {
            cookieHeader.append("; Domain=").append(cookie.getDomain());
        }
        cookieHeader.append("; SameSite=").append(sameSite);
        
        response.addHeader("Set-Cookie", cookieHeader.toString());
    }

    /**
     * Extract access token from cookies.
     */
    public Optional<String> getAccessTokenFromCookies(HttpServletRequest request) {
        return getCookieValue(request, ACCESS_TOKEN_COOKIE);
    }

    /**
     * Extract refresh token from cookies.
     */
    public Optional<String> getRefreshTokenFromCookies(HttpServletRequest request) {
        return getCookieValue(request, REFRESH_TOKEN_COOKIE);
    }

    /**
     * Get a cookie value by name.
     */
    private Optional<String> getCookieValue(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        return Arrays.stream(cookies)
                .filter(cookie -> name.equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst();
    }

    /**
     * Create a cookie that clears the access token (for logout).
     */
    public Cookie createClearAccessTokenCookie() {
        return createClearCookie(ACCESS_TOKEN_COOKIE);
    }

    /**
     * Create a cookie that clears the refresh token (for logout).
     */
    public Cookie createClearRefreshTokenCookie() {
        return createClearCookie(REFRESH_TOKEN_COOKIE);
    }

    /**
     * Create a cookie that clears an existing cookie.
     */
    private Cookie createClearCookie(String name) {
        Cookie cookie = new Cookie(name, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(secureCookie);
        cookie.setPath("/");
        cookie.setMaxAge(0);  // Immediately expire
        return cookie;
    }
}
