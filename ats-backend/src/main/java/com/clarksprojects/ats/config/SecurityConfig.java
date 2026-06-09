package com.clarksprojects.ats.config;

import com.clarksprojects.ats.security.JwtRequestFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private static final String R_ADMIN = "ADMIN";
    private static final String R_RECRUITER = "RECRUITER";
    private static final String R_MANAGER = "HIRING_MANAGER";

    private static final String[] PUBLIC_ENDPOINTS = {
            "/api/auth/login",
            "/api/auth/refresh",
            "/api/health",
            "/actuator/health/**"
    };

    @Value("${app.cors.allowed-origins:http://localhost:4200,http://localhost:8084}")
    private List<String> allowedOrigins;

    private final JwtRequestFilter jwtRequestFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // CSRF protection is provided by the SameSite=Lax auth cookie (see CookieUtil):
                // it is not sent on cross-site POST/PUT/PATCH/DELETE, so forged mutations arrive
                // unauthenticated. (CORS does not stop CSRF on its own — it only blocks reading
                // the response, not sending the request.)
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .httpBasic(b -> b.disable())
                .formLogin(f -> f.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // SPA-friendly: return 401 (not 302 redirect) for unauthenticated requests.
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                        // Resume download links — public so candidate cards work without forcing
                        // an Authorization header on direct browser navigation.
                        .requestMatchers(HttpMethod.GET, "/api/talent-pool/resumes/**").permitAll()

                        // Reads on the operational data
                        .requestMatchers(HttpMethod.GET, "/api/jobs/**",
                                "/api/candidates/**",
                                "/api/dashboard/**",
                                "/api/tags/**",
                                "/api/activities/**",
                                "/api/notes/**",
                                "/api/tasks/**")
                            .hasAnyRole(R_ADMIN, R_RECRUITER, R_MANAGER)

                        // Notes and task completions are open to hiring managers as well
                        .requestMatchers(HttpMethod.POST, "/api/notes/**").hasAnyRole(R_ADMIN, R_RECRUITER, R_MANAGER)
                        .requestMatchers(HttpMethod.PATCH, "/api/tasks/*/status").hasAnyRole(R_ADMIN, R_RECRUITER, R_MANAGER)

                        // All other mutations require recruiter or admin
                        .requestMatchers(HttpMethod.POST, "/api/**").hasAnyRole(R_ADMIN, R_RECRUITER)
                        .requestMatchers(HttpMethod.PUT, "/api/**").hasAnyRole(R_ADMIN, R_RECRUITER)
                        .requestMatchers(HttpMethod.PATCH, "/api/**").hasAnyRole(R_ADMIN, R_RECRUITER)
                        .requestMatchers(HttpMethod.DELETE, "/api/**").hasAnyRole(R_ADMIN, R_RECRUITER)

                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "Authorization", "X-XSRF-TOKEN",
                "Accept", "Origin", "X-Requested-With"));
        config.setExposedHeaders(List.of("X-XSRF-TOKEN"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration cfg) throws Exception {
        return cfg.getAuthenticationManager();
    }
}
