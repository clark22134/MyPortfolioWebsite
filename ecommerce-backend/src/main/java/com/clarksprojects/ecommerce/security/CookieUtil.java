package com.clarksprojects.ecommerce.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CookieUtil {

    public static final String JWT_COOKIE_NAME = "ecommerce_jwt";

    @Value("${app.cookie.secure:true}")
    private boolean secureCookie;

    @Value("${app.cookie.same-site:Strict}")
    private String sameSite;

    public void addJwtCookie(HttpServletResponse response, String token, int maxAgeSeconds) {
        Cookie cookie = new Cookie(JWT_COOKIE_NAME, token);
        cookie.setHttpOnly(true);
        cookie.setSecure(secureCookie);
        cookie.setPath("/");
        cookie.setMaxAge(maxAgeSeconds);

        // SameSite attribute requires manual header addition
        String cookieHeader = String.format(
                "%s=%s; Path=/; Max-Age=%d; HttpOnly; SameSite=%s%s",
                JWT_COOKIE_NAME, token, maxAgeSeconds, sameSite,
                secureCookie ? "; Secure" : ""
        );
        response.addHeader("Set-Cookie", cookieHeader);
    }

    public void clearJwtCookie(HttpServletResponse response) {
        String cookieHeader = String.format(
                "%s=; Path=/; Max-Age=0; HttpOnly; SameSite=%s%s",
                JWT_COOKIE_NAME, sameSite,
                secureCookie ? "; Secure" : ""
        );
        response.addHeader("Set-Cookie", cookieHeader);
    }
}
