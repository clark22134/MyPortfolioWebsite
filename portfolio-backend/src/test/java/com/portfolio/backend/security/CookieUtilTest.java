package com.portfolio.backend.security;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class CookieUtilTest {

    @Autowired
    private CookieUtil cookieUtil;

    // ── createAccessTokenCookie ───────────────────────────────────────────────

    @Test
    void createAccessTokenCookie_hasCorrectName() {
        Cookie cookie = cookieUtil.createAccessTokenCookie("access-token-value");

        assertThat(cookie.getName()).isEqualTo(CookieUtil.ACCESS_TOKEN_COOKIE);
    }

    @Test
    void createAccessTokenCookie_hasCorrectValue() {
        Cookie cookie = cookieUtil.createAccessTokenCookie("my-access-token");

        assertThat(cookie.getValue()).isEqualTo("my-access-token");
    }

    @Test
    void createAccessTokenCookie_isHttpOnly() {
        Cookie cookie = cookieUtil.createAccessTokenCookie("token");

        assertThat(cookie.isHttpOnly()).isTrue();
    }

    @Test
    void createAccessTokenCookie_hasPositiveMaxAge() {
        Cookie cookie = cookieUtil.createAccessTokenCookie("token");

        assertThat(cookie.getMaxAge()).isGreaterThan(0);
    }

    @Test
    void createAccessTokenCookie_hasRootPath() {
        Cookie cookie = cookieUtil.createAccessTokenCookie("token");

        assertThat(cookie.getPath()).isEqualTo("/");
    }

    // ── createRefreshTokenCookie ──────────────────────────────────────────────

    @Test
    void createRefreshTokenCookie_hasCorrectName() {
        Cookie cookie = cookieUtil.createRefreshTokenCookie("refresh-token-value");

        assertThat(cookie.getName()).isEqualTo(CookieUtil.REFRESH_TOKEN_COOKIE);
    }

    @Test
    void createRefreshTokenCookie_hasLongerExpiryThanAccessToken() {
        Cookie access = cookieUtil.createAccessTokenCookie("access");
        Cookie refresh = cookieUtil.createRefreshTokenCookie("refresh");

        assertThat(refresh.getMaxAge()).isGreaterThan(access.getMaxAge());
    }

    // ── createClearAccessTokenCookie ──────────────────────────────────────────

    @Test
    void createClearAccessTokenCookie_hasMaxAgeZero() {
        Cookie cookie = cookieUtil.createClearAccessTokenCookie();

        assertThat(cookie.getMaxAge()).isZero();
    }

    @Test
    void createClearAccessTokenCookie_hasCorrectName() {
        Cookie cookie = cookieUtil.createClearAccessTokenCookie();

        assertThat(cookie.getName()).isEqualTo(CookieUtil.ACCESS_TOKEN_COOKIE);
    }

    @Test
    void createClearAccessTokenCookie_hasRootPath() {
        Cookie cookie = cookieUtil.createClearAccessTokenCookie();

        assertThat(cookie.getPath()).isEqualTo("/");
    }

    // ── createClearRefreshTokenCookie ─────────────────────────────────────────

    @Test
    void createClearRefreshTokenCookie_hasMaxAgeZero() {
        Cookie cookie = cookieUtil.createClearRefreshTokenCookie();

        assertThat(cookie.getMaxAge()).isZero();
    }

    @Test
    void createClearRefreshTokenCookie_hasCorrectName() {
        Cookie cookie = cookieUtil.createClearRefreshTokenCookie();

        assertThat(cookie.getName()).isEqualTo(CookieUtil.REFRESH_TOKEN_COOKIE);
    }

    // ── getAccessTokenFromCookies ─────────────────────────────────────────────

    @Test
    void getAccessTokenFromCookies_whenCookiePresent_returnsValue() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie(CookieUtil.ACCESS_TOKEN_COOKIE, "test-access-jwt"));

        Optional<String> result = cookieUtil.getAccessTokenFromCookies(request);

        assertThat(result).isPresent().contains("test-access-jwt");
    }

    @Test
    void getAccessTokenFromCookies_whenNoCookies_returnsEmpty() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        Optional<String> result = cookieUtil.getAccessTokenFromCookies(request);

        assertThat(result).isEmpty();
    }

    @Test
    void getAccessTokenFromCookies_whenOtherCookiesPresent_returnsEmpty() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("some_other_cookie", "other-value"));

        Optional<String> result = cookieUtil.getAccessTokenFromCookies(request);

        assertThat(result).isEmpty();
    }

    // ── getRefreshTokenFromCookies ────────────────────────────────────────────

    @Test
    void getRefreshTokenFromCookies_whenCookiePresent_returnsValue() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie(CookieUtil.REFRESH_TOKEN_COOKIE, "test-refresh-jwt"));

        Optional<String> result = cookieUtil.getRefreshTokenFromCookies(request);

        assertThat(result).isPresent().contains("test-refresh-jwt");
    }

    @Test
    void getRefreshTokenFromCookies_whenNoCookies_returnsEmpty() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        Optional<String> result = cookieUtil.getRefreshTokenFromCookies(request);

        assertThat(result).isEmpty();
    }

    // ── addCookieWithSameSite ────────────────────────────────────────────────

    @Test
    void addCookieWithSameSite_appendsSetCookieHeaderWithSameSite() {
        Cookie cookie = cookieUtil.createAccessTokenCookie("my-token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        cookieUtil.addCookieWithSameSite(response, cookie, "Strict");

        String setCookieHeader = response.getHeader("Set-Cookie");
        assertThat(setCookieHeader).contains("SameSite=Strict");
        assertThat(setCookieHeader).contains("access_token=my-token");
        assertThat(setCookieHeader).contains("HttpOnly");
        assertThat(setCookieHeader).contains("Path=/");
    }

    @Test
    void addCookieWithSameSite_laxSameSite_setsLaxValue() {
        Cookie cookie = cookieUtil.createRefreshTokenCookie("refresh-value");
        MockHttpServletResponse response = new MockHttpServletResponse();

        cookieUtil.addCookieWithSameSite(response, cookie, "Lax");

        assertThat(response.getHeader("Set-Cookie")).contains("SameSite=Lax");
    }
}
