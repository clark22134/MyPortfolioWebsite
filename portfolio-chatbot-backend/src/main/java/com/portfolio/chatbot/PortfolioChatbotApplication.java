package com.portfolio.chatbot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;

/**
 * Standalone chatbot service. No JPA/JDBC — the bot's knowledge comes from
 * bundled markdown so this Lambda can run outside the VPC and reach
 * api.openai.com directly. We explicitly exclude the auto-configurations
 * that would otherwise try to start a DataSource just because Hibernate
 * jars happen to land on the classpath transitively.
 */
@SpringBootApplication(exclude = {
        DataSourceAutoConfiguration.class,
        HibernateJpaAutoConfiguration.class
})
public class PortfolioChatbotApplication {

    public static void main(String[] args) {
        // Mirror the Lambda path: resolve the OpenAI key from Secrets Manager
        // before the context starts when OPENAI_SECRET_ARN is set; otherwise a
        // no-op so local runs still honour an exported OPENAI_API_KEY.
        OpenAiKeyResolver.loadFromSecretsManagerIfConfigured();
        SpringApplication.run(PortfolioChatbotApplication.class, args);
    }
}
