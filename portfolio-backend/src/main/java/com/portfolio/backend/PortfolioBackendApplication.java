package com.portfolio.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.actuate.autoconfigure.security.reactive.ReactiveManagementWebSecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.web.reactive.WebFluxAutoConfiguration;
import org.springframework.boot.autoconfigure.web.reactive.HttpHandlerAutoConfiguration;
import org.springframework.boot.autoconfigure.web.reactive.ReactiveWebServerFactoryAutoConfiguration;
import org.springframework.boot.autoconfigure.web.reactive.error.ErrorWebFluxAutoConfiguration;
import org.springframework.scheduling.annotation.EnableScheduling;

// The Spring AI OpenAI starter transitively pulls in spring-boot-starter-webflux,
// which causes Spring Boot to auto-configure BOTH the servlet and reactive
// security/web stacks. They each try to register a bean named
// `springSecurityFilterChain`, which fails with BeanDefinitionOverrideException
// at Lambda SnapStart init. We're a servlet/MVC app, so explicitly disable the
// reactive auto-configurations.
@SpringBootApplication(exclude = {
    ReactiveManagementWebSecurityAutoConfiguration.class,
    WebFluxAutoConfiguration.class,
    HttpHandlerAutoConfiguration.class,
    ReactiveWebServerFactoryAutoConfiguration.class,
    ErrorWebFluxAutoConfiguration.class
})
@EnableScheduling
public class PortfolioBackendApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(PortfolioBackendApplication.class, args);
    }
}
