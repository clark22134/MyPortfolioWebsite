-- HireFlow ATS — Authentication, users, and refresh tokens
--
-- Demo users are seeded at application startup by DemoUserInitializer
-- so the password column always contains a valid BCrypt hash generated
-- by the live PasswordEncoder (instead of a pre-baked hash in SQL).

CREATE TABLE app_user (
    id            BIGSERIAL PRIMARY KEY,
    username      VARCHAR(100) NOT NULL UNIQUE,
    password      VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    role          VARCHAR(50)  NOT NULL,
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

CREATE INDEX idx_app_user_role ON app_user (role);

CREATE TABLE refresh_token (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT       NOT NULL,
    token        VARCHAR(512) NOT NULL UNIQUE,
    expires_at   TIMESTAMP    NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at   TIMESTAMP,
    user_agent   VARCHAR(500),
    ip_address   VARCHAR(64),
    CONSTRAINT fk_refresh_token_user FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_token_user_id ON refresh_token (user_id);
CREATE INDEX idx_refresh_token_expires ON refresh_token (expires_at);
