package com.portfolio.chatbot;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;

import java.util.Optional;
import java.util.function.UnaryOperator;

/**
 * Resolves the OpenAI API key from AWS Secrets Manager at startup and exposes
 * it to Spring as the {@code spring.ai.openai.api-key} system property, so the
 * key never has to live in the Lambda's environment variables (which are
 * plaintext and readable via {@code lambda:GetFunctionConfiguration}).
 *
 * <p>This must run <em>before</em> the Spring context is built so the resolved
 * value is visible to {@link ChatbotConfig}'s
 * {@code @ConditionalOnExpression("... !'${spring.ai.openai.api-key:}'.isEmpty()")}.
 * Hence it is invoked from {@link StreamLambdaHandler}'s static initializer and
 * {@link PortfolioChatbotApplication#main(String[])} rather than as a Spring bean.
 *
 * <p>Behaviour is deliberately fail-soft and side-effect-free unless an actual
 * secret ARN is configured:
 * <ul>
 *   <li>No {@code OPENAI_SECRET_ARN} env var (local dev / CI / tests) → no-op,
 *       no AWS call. The existing {@code ${OPENAI_API_KEY:}} fallback in
 *       application.properties still applies, so {@code export OPENAI_API_KEY=…}
 *       keeps working locally.</li>
 *   <li>ARN present but the fetch fails (or the secret is empty) → log + no-op,
 *       leaving the key empty so the chatbot auto-disables. The Lambda still
 *       boots and serves {@code /api/chatbot/health}, matching the module's
 *       existing graceful-degradation model.</li>
 * </ul>
 */
public final class OpenAiKeyResolver {

    static final String SECRET_ARN_ENV = "OPENAI_SECRET_ARN";
    static final String API_KEY_PROPERTY = "spring.ai.openai.api-key";

    private static final Logger log = LoggerFactory.getLogger(OpenAiKeyResolver.class);

    private OpenAiKeyResolver() {
    }

    /**
     * Production entry point. Reads {@code OPENAI_SECRET_ARN} from the
     * environment and, when set, fetches the secret from Secrets Manager and
     * publishes it as the {@code spring.ai.openai.api-key} system property.
     * Safe to call more than once (e.g. across Lambda re-initializations).
     */
    public static void loadFromSecretsManagerIfConfigured() {
        resolve(System.getenv(SECRET_ARN_ENV), OpenAiKeyResolver::fetchSecret)
                .ifPresent(key -> System.setProperty(API_KEY_PROPERTY, key));
    }

    /**
     * Core, side-effect-free resolution logic (package-private for testing).
     *
     * @param secretArn     the Secrets Manager ARN, or {@code null}/blank to skip
     * @param secretFetcher fetches the raw secret string for a given ARN
     * @return the resolved API key, or empty when not configured / unavailable
     */
    static Optional<String> resolve(String secretArn, UnaryOperator<String> secretFetcher) {
        if (secretArn == null || secretArn.isBlank()) {
            return Optional.empty();
        }
        // Already populated (an explicit -Dspring.ai.openai.api-key, or a prior
        // call on a warm Lambda): don't spend a Secrets Manager call to re-set it.
        String existing = System.getProperty(API_KEY_PROPERTY);
        if (existing != null && !existing.isBlank()) {
            return Optional.empty();
        }
        try {
            String secret = secretFetcher.apply(secretArn);
            if (secret == null || secret.isBlank()) {
                log.warn("OPENAI_SECRET_ARN is set but the secret value is empty; chatbot will be disabled.");
                return Optional.empty();
            }
            log.info("Loaded OpenAI API key from Secrets Manager; not stored in the Lambda environment.");
            return Optional.of(secret.trim());
        } catch (RuntimeException e) {
            log.error("Failed to load OpenAI API key from Secrets Manager; chatbot will be disabled.", e);
            return Optional.empty();
        }
    }

    private static String fetchSecret(String secretArn) {
        // url-connection-client (set explicitly so no auto-discovery is needed)
        // keeps the SDK footprint to the JDK's HttpURLConnection. Region and
        // credentials come from the Lambda execution environment's default chains.
        try (SecretsManagerClient client = SecretsManagerClient.builder()
                .httpClient(UrlConnectionHttpClient.create())
                .build()) {
            return client.getSecretValue(GetSecretValueRequest.builder()
                    .secretId(secretArn)
                    .build()).secretString();
        }
    }
}
