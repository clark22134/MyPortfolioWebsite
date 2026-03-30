package com.clarksprojects.ats.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web configuration.
 * CORS is now handled by SecurityConfig; this class can be used for other MVC customizations.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
}
