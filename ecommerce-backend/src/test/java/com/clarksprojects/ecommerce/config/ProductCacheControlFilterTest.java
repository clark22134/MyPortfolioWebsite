package com.clarksprojects.ecommerce.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class ProductCacheControlFilterTest {

    private ProductCacheControlFilter filter;

    @BeforeEach
    void setUp() {
        filter = new ProductCacheControlFilter();
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private MockHttpServletResponse doGet(String path) throws Exception {
        return doRequest("GET", path, null, HttpServletResponse.SC_OK, null);
    }

    private MockHttpServletResponse doRequest(
            String method, String path,
            String authHeader, int responseStatus,
            String existingCacheControl) throws Exception {

        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        if (authHeader != null) {
            request.addHeader("Authorization", authHeader);
        }

        MockHttpServletResponse response = new MockHttpServletResponse();
        response.setStatus(responseStatus);
        if (existingCacheControl != null) {
            response.addHeader("Cache-Control", existingCacheControl);
        }

        // FilterChain that copies the prepared status/headers into the response
        FilterChain chain = (req, res) -> {
            // simulate upstream handler completing with status already set
        };

        filter.doFilterInternal(request, response, chain);
        return response;
    }

    // ── Happy-path: cache header is added ────────────────────────────────────

    @Test
    void productsEndpoint_getWith200_addsCacheControlHeader() throws Exception {
        MockHttpServletResponse response = doGet("/api/products");

        assertThat(response.getHeader("Cache-Control"))
                .isEqualTo("public, max-age=60, s-maxage=300");
    }

    @Test
    void productsEndpoint_getWithSubPath_addsCacheControlHeader() throws Exception {
        MockHttpServletResponse response = doGet("/api/products/search?name=foo");

        assertThat(response.getHeader("Cache-Control"))
                .isEqualTo("public, max-age=60, s-maxage=300");
    }

    @Test
    void productCategoryEndpoint_getWith200_addsCacheControlHeader() throws Exception {
        MockHttpServletResponse response = doGet("/api/product-category");

        assertThat(response.getHeader("Cache-Control"))
                .isEqualTo("public, max-age=60, s-maxage=300");
    }

    // ── Non-GET method: filter is a no-op ────────────────────────────────────

    @Test
    void products_postRequest_doesNotAddCacheControlHeader() throws Exception {
        MockHttpServletResponse response = doRequest("POST", "/api/products", null,
                HttpServletResponse.SC_OK, null);

        assertThat(response.getHeader("Cache-Control")).isNull();
    }

    @Test
    void products_putRequest_doesNotAddCacheControlHeader() throws Exception {
        MockHttpServletResponse response = doRequest("PUT", "/api/products/1", null,
                HttpServletResponse.SC_OK, null);

        assertThat(response.getHeader("Cache-Control")).isNull();
    }

    // ── Non-matching path ─────────────────────────────────────────────────────

    @Test
    void otherPath_get200_doesNotAddCacheControlHeader() throws Exception {
        MockHttpServletResponse response = doGet("/api/orders");

        assertThat(response.getHeader("Cache-Control")).isNull();
    }

    @Test
    void authPath_get200_doesNotAddCacheControlHeader() throws Exception {
        MockHttpServletResponse response = doGet("/api/auth/profile");

        assertThat(response.getHeader("Cache-Control")).isNull();
    }

    // ── Authenticated request ─────────────────────────────────────────────────

    @Test
    void products_getWithAuthorizationHeader_doesNotAddCacheControlHeader() throws Exception {
        MockHttpServletResponse response = doRequest("GET", "/api/products", "Bearer some-jwt",
                HttpServletResponse.SC_OK, null);

        assertThat(response.getHeader("Cache-Control")).isNull();
    }

    // ── Non-200 status ────────────────────────────────────────────────────────

    @Test
    void products_get404_doesNotAddCacheControlHeader() throws Exception {
        MockHttpServletResponse response = doRequest("GET", "/api/products", null,
                HttpServletResponse.SC_NOT_FOUND, null);

        assertThat(response.getHeader("Cache-Control")).isNull();
    }

    @Test
    void products_get500_doesNotAddCacheControlHeader() throws Exception {
        MockHttpServletResponse response = doRequest("GET", "/api/products", null,
                HttpServletResponse.SC_INTERNAL_SERVER_ERROR, null);

        assertThat(response.getHeader("Cache-Control")).isNull();
    }

    // ── Already has Cache-Control ─────────────────────────────────────────────

    @Test
    void products_get200ButCacheControlAlreadySet_doesNotOverrideHeader() throws Exception {
        MockHttpServletResponse response = doRequest("GET", "/api/products", null,
                HttpServletResponse.SC_OK, "no-store");

        assertThat(response.getHeader("Cache-Control")).isEqualTo("no-store");
    }
}
