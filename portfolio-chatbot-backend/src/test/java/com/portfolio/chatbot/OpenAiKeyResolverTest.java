package com.portfolio.chatbot;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.UnaryOperator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Unit tests for {@link OpenAiKeyResolver}'s core resolution logic. These cover
 * every branch without touching AWS by injecting a fake secret fetcher; the
 * thin {@code fetchSecret} wrapper around the real SecretsManagerClient is the
 * only uncovered line and is exercised end-to-end at deploy time.
 */
class OpenAiKeyResolverTest {

    private String savedProperty;

    @BeforeEach
    void clearProperty() {
        savedProperty = System.getProperty(OpenAiKeyResolver.API_KEY_PROPERTY);
        System.clearProperty(OpenAiKeyResolver.API_KEY_PROPERTY);
    }

    @AfterEach
    void restoreProperty() {
        if (savedProperty == null) {
            System.clearProperty(OpenAiKeyResolver.API_KEY_PROPERTY);
        } else {
            System.setProperty(OpenAiKeyResolver.API_KEY_PROPERTY, savedProperty);
        }
    }

    @Test
    void nullArnSkipsFetchAndReturnsEmpty() {
        AtomicInteger calls = new AtomicInteger();
        UnaryOperator<String> fetcher = arn -> {
            calls.incrementAndGet();
            return "sk-should-not-be-called";
        };

        assertThat(OpenAiKeyResolver.resolve(null, fetcher)).isEmpty();
        assertThat(calls.get()).isZero();
    }

    @Test
    void blankArnSkipsFetchAndReturnsEmpty() {
        AtomicInteger calls = new AtomicInteger();
        UnaryOperator<String> fetcher = arn -> {
            calls.incrementAndGet();
            return "sk-should-not-be-called";
        };

        assertThat(OpenAiKeyResolver.resolve("   ", fetcher)).isEmpty();
        assertThat(calls.get()).isZero();
    }

    @Test
    void presentArnReturnsFetchedKey() {
        Optional<String> resolved = OpenAiKeyResolver.resolve("arn:secret", arn -> "sk-live-key");

        assertThat(resolved).contains("sk-live-key");
    }

    @Test
    void fetchedKeyIsTrimmed() {
        Optional<String> resolved = OpenAiKeyResolver.resolve("arn:secret", arn -> "  sk-padded  ");

        assertThat(resolved).contains("sk-padded");
    }

    @Test
    void emptySecretValueReturnsEmpty() {
        assertThat(OpenAiKeyResolver.resolve("arn:secret", arn -> "  ")).isEmpty();
    }

    @Test
    void fetchFailureIsSwallowedAndReturnsEmpty() {
        Optional<String> resolved = OpenAiKeyResolver.resolve("arn:secret", arn -> {
            throw new IllegalStateException("Secrets Manager unreachable");
        });

        assertThat(resolved).isEmpty();
    }

    /**
     * Guards the pom exclusions of apache-client and netty-nio-client: builds
     * the real sync SecretsManagerClient over url-connection-client (no network
     * call) and asserts construction succeeds, so a missing transitive surfaces
     * here rather than as a runtime NoClassDefFoundError in the Lambda.
     */
    @Test
    void syncClientConstructsOverUrlConnectionWithoutDefaultHttpClients() {
        assertThatCode(() -> {
            try (SecretsManagerClient client = SecretsManagerClient.builder()
                    .httpClient(UrlConnectionHttpClient.create())
                    .region(Region.US_EAST_1)
                    .credentialsProvider(StaticCredentialsProvider.create(
                            AwsBasicCredentials.create("test-access-key", "test-secret-key")))
                    .build()) {
                assertThat(client).isNotNull();
            }
        }).doesNotThrowAnyException();
    }

    @Test
    void existingSystemPropertyIsNotOverwritten() {
        System.setProperty(OpenAiKeyResolver.API_KEY_PROPERTY, "sk-pre-set");
        AtomicInteger calls = new AtomicInteger();

        Optional<String> resolved = OpenAiKeyResolver.resolve("arn:secret", arn -> {
            calls.incrementAndGet();
            return "sk-from-secrets-manager";
        });

        // A non-blank pre-existing value short-circuits before any fetch.
        assertThat(resolved).isEmpty();
        assertThat(calls.get()).isZero();
    }
}
