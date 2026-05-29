package com.clarksprojects.ats.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Production-only Flyway lifecycle: run {@code repair()} before {@code migrate()}
 * so that any rows left in {@code flyway_schema_history} by a previously
 * crashed deploy (e.g. a Spring init failure that happened mid-migration) get
 * cleared before the next {@code migrate()} call. Without this, a single
 * broken deploy can leave the schema permanently un-bootable because Flyway
 * refuses to proceed past a FAILED row.
 *
 * <p>The {@code dev} / {@code test} profiles use H2 + {@code ddl-auto=create-drop}
 * with Flyway disabled, so this strategy doesn't apply there.
 */
@Configuration
@Profile("prod")
@Slf4j
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy repairThenMigrate() {
        return flyway -> {
            try {
                flyway.repair();
            } catch (Exception e) {
                log.warn("Flyway repair failed (likely no broken state to clean up). Continuing to migrate. Cause: {}",
                        e.getMessage());
            }
            flyway.migrate();
        };
    }
}
