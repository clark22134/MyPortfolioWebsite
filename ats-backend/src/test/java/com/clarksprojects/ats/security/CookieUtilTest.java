package com.clarksprojects.ats.security;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class CookieUtilTest {

    private CookieUtil cookieUtil;

    @BeforeEach
    void setUp() {
        cookieUtil = new CookieUtil();
        ReflectionTestUtils.setField(cookieUtil, "accessTokenExpirationMs", 900_000L);
        ReflectionTestUtils.setField(cookieUtil, "refreshTokenExpirationMs", 604_800_000L);
        ReflectionTestUtils.setField(cookieUtil, "secureCookie", true);
        ReflectionTestUtils.setField(cookieUtil, "cookieDomain", ".example.com");
    }

    @Test
    void writeAccessTokenCookie_emitsSecureHttpOnlyHeader() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        cookieUtil.writeAccessTokenCookie(response, "abc.def.ghi");

        String header = response.getHeader("Set-Cookie");
        assertThat(header)
                .startsWith("ats_access_token=abc.def.ghi")
                .contains("HttpOnly")
                .contains("Secure")
                .contains("SameSite=Lax")
                .contains("Path=/")
                .contains("Max-Age=900")
                .contains("Domain=.example.com");
    }

    @Test
    void writeRefreshTokenCookie_usesRefreshTtl() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        cookieUtil.writeRefreshTokenCookie(response, "rrr");

        String header = response.getHeader("Set-Cookie");
        assertThat(header).contains("Max-Age=604800");
        assertThat(header).startsWith("ats_refresh_token=rrr");
    }

    @Test
    void clearAuthCookies_writesEmptyExpiredCookies() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        cookieUtil.clearAuthCookies(response);

        assertThat(response.getHeaders("Set-Cookie"))
                .hasSize(2)
                .anyMatch(h -> h.startsWith("ats_access_token="))
                .anyMatch(h -> h.startsWith("ats_refresh_token="))
                .allMatch(h -> h.contains("Max-Age=0"));
    }

    @Test
    void readAccessToken_returnsValueWhenCookieSet() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("ats_access_token", "tok"));
        assertThat(cookieUtil.readAccessToken(request)).contains("tok");
    }

    @Test
    void readAccessToken_blankValue_returnsEmpty() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("ats_access_token", ""));
        assertThat(cookieUtil.readAccessToken(request)).isEmpty();
    }

    @Test
    void readRefreshToken_noCookies_returnsEmpty() {
        assertThat(cookieUtil.readRefreshToken(new MockHttpServletRequest())).isEmpty();
    }

    @Test
    void insecureMode_omitsSecureFlag() {
        ReflectionTestUtils.setField(cookieUtil, "secureCookie", false);
        ReflectionTestUtils.setField(cookieUtil, "cookieDomain", "");
        MockHttpServletResponse response = new MockHttpServletResponse();
        cookieUtil.writeAccessTokenCookie(response, "tok");

        String header = response.getHeader("Set-Cookie");
        assertThat(header).doesNotContain("Secure");
        assertThat(header).doesNotContain("Domain=");
    }
}
