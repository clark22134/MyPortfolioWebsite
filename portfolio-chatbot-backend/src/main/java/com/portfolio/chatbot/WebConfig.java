package com.portfolio.chatbot;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Minimal web configuration. The chatbot Lambda exposes only public,
 * read-only endpoints — there's no auth, no JWT, no CSRF concerns. CORS
 * is enabled so the Angular frontend on clarkfoster.com can call us
 * directly when CloudFront forwards a /api/chatbot/* request.
 */
@Configuration
public class WebConfig {

    private final String allowedOrigins;

    public WebConfig(@org.springframework.beans.factory.annotation.Value("${cors.allowed.origins}") String allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
