package com.clarksprojects.ats.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Optional;

/**
 * Helpers for the access/refresh JWT cookies. Cookies are HTTP-only and use
 * SameSite=Lax by default so the browser still sends them on top-level
 * navigations (e.g. clicking a link to the SPA).
 */
@Component
public class CookieUtil {

    public static final String ACCESS_TOKEN_COOKIE = "ats_access_token";
    public static final String REFRESH_TOKEN_COOKIE = "ats_refresh_token";

    @Value("${jwt.access.expiration:900000}")
    private Long accessTokenExpirationMs;

    @Value("${jwt.refresh.expiration:604800000}")
    private Long refreshTokenExpirationMs;

    @Value("${cookie.secure:true}")
    private boolean secureCookie;

    @Value("${cookie.domain:}")
    private String cookieDomain;

    public void writeAccessTokenCookie(HttpServletResponse response, String token) {
        writeCookie(response, ACCESS_TOKEN_COOKIE, token, (int) (accessTokenExpirationMs / 1000));
    }

    public void writeRefreshTokenCookie(HttpServletResponse response, String token) {
        writeCookie(response, REFRESH_TOKEN_COOKIE, token, (int) (refreshTokenExpirationMs / 1000));
    }

    public void clearAuthCookies(HttpServletResponse response) {
        writeCookie(response, ACCESS_TOKEN_COOKIE, "", 0);
        writeCookie(response, REFRESH_TOKEN_COOKIE, "", 0);
    }

    public Optional<String> readAccessToken(HttpServletRequest request) {
        return readCookie(request, ACCESS_TOKEN_COOKIE);
    }

    public Optional<String> readRefreshToken(HttpServletRequest request) {
        return readCookie(request, REFRESH_TOKEN_COOKIE);
    }

    private void writeCookie(HttpServletResponse response, String name, String value, int maxAgeSeconds) {
        StringBuilder header = new StringBuilder();
        header.append(name).append("=").append(value);
        header.append("; Path=/");
        header.append("; Max-Age=").append(maxAgeSeconds);
        header.append("; HttpOnly");
        header.append("; SameSite=Lax");
        if (secureCookie) {
            header.append("; Secure");
        }
        if (cookieDomain != null && !cookieDomain.isBlank()) {
            header.append("; Domain=").append(cookieDomain);
        }
        response.addHeader("Set-Cookie", header.toString());
    }

    private Optional<String> readCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return Optional.empty();
        return Arrays.stream(cookies)
                .filter(c -> name.equals(c.getName()))
                .map(Cookie::getValue)
                .filter(v -> v != null && !v.isBlank())
                .findFirst();
    }
}
