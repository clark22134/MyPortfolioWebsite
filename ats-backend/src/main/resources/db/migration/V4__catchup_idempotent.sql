-- V4 catch-up migration.
--
-- Background: the first prod deploys of the new auth/notes/activity work
-- (v47, v48) ran V2 and V3 against an Aurora `ats` database that already had
-- the V1 `job`/`candidate` tables (legacy seed). Flyway baselined at V1 by
-- default and started running V2/V3, but the broken Spring init (missing
-- JWT_SECRET) appears to have left flyway_schema_history with rows that
-- don't match reality — specifically the `activity` table is missing while
-- Flyway reports nothing to migrate.
--
-- Rather than hand-fixing the prod history table, this migration recreates
-- every V2/V3 table with `IF NOT EXISTS`, so:
--   • on a database where V2/V3 succeeded → all `CREATE` statements are no-ops
--   • on a database where V2/V3 didn't run → the tables get created cleanly
-- The result is the same final schema either way.
--
-- All inserts use `ON CONFLICT DO NOTHING` so re-runs are safe.

-- ── V2 tables ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_user (
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

CREATE INDEX IF NOT EXISTS idx_app_user_role ON app_user (role);

CREATE TABLE IF NOT EXISTS refresh_token (
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

CREATE INDEX IF NOT EXISTS idx_refresh_token_user_id ON refresh_token (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_token_expires ON refresh_token (expires_at);

-- ── V3 tables ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_note (
    id           BIGSERIAL PRIMARY KEY,
    candidate_id BIGINT       NOT NULL,
    author_id    BIGINT,
    body         TEXT         NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_note_candidate FOREIGN KEY (candidate_id) REFERENCES candidate (id) ON DELETE CASCADE,
    CONSTRAINT fk_note_author    FOREIGN KEY (author_id)    REFERENCES app_user (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_candidate_note_candidate_id ON candidate_note (candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_note_created_at ON candidate_note (created_at);

CREATE TABLE IF NOT EXISTS activity (
    id           BIGSERIAL PRIMARY KEY,
    type         VARCHAR(64)  NOT NULL,
    candidate_id BIGINT,
    job_id       BIGINT,
    actor_id     BIGINT,
    summary      VARCHAR(500) NOT NULL,
    metadata     TEXT,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activity_candidate FOREIGN KEY (candidate_id) REFERENCES candidate (id) ON DELETE CASCADE,
    CONSTRAINT fk_activity_job       FOREIGN KEY (job_id)       REFERENCES job (id) ON DELETE CASCADE,
    CONSTRAINT fk_activity_actor     FOREIGN KEY (actor_id)     REFERENCES app_user (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_candidate_id ON activity (candidate_id);
CREATE INDEX IF NOT EXISTS idx_activity_job_id ON activity (job_id);
CREATE INDEX IF NOT EXISTS idx_activity_actor_id ON activity (actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity (type);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity (created_at DESC);

CREATE TABLE IF NOT EXISTS task (
    id            BIGSERIAL PRIMARY KEY,
    subject       VARCHAR(255) NOT NULL,
    description   TEXT,
    candidate_id  BIGINT,
    job_id        BIGINT,
    assignee_id   BIGINT,
    creator_id    BIGINT,
    priority      VARCHAR(32)  NOT NULL DEFAULT 'NORMAL',
    status        VARCHAR(32)  NOT NULL DEFAULT 'OPEN',
    due_at        TIMESTAMP,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at  TIMESTAMP,
    CONSTRAINT fk_task_candidate FOREIGN KEY (candidate_id) REFERENCES candidate (id) ON DELETE SET NULL,
    CONSTRAINT fk_task_job       FOREIGN KEY (job_id)       REFERENCES job (id)       ON DELETE SET NULL,
    CONSTRAINT fk_task_assignee  FOREIGN KEY (assignee_id)  REFERENCES app_user (id)  ON DELETE SET NULL,
    CONSTRAINT fk_task_creator   FOREIGN KEY (creator_id)   REFERENCES app_user (id)  ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_task_status       ON task (status);
CREATE INDEX IF NOT EXISTS idx_task_assignee     ON task (assignee_id);
CREATE INDEX IF NOT EXISTS idx_task_due_at       ON task (due_at);
CREATE INDEX IF NOT EXISTS idx_task_candidate_id ON task (candidate_id);

CREATE TABLE IF NOT EXISTS tag (
    id    BIGSERIAL PRIMARY KEY,
    name  VARCHAR(64) NOT NULL UNIQUE,
    color VARCHAR(16)
);

CREATE TABLE IF NOT EXISTS candidate_tag (
    candidate_id BIGINT NOT NULL,
    tag_id       BIGINT NOT NULL,
    PRIMARY KEY (candidate_id, tag_id),
    CONSTRAINT fk_candidate_tag_candidate FOREIGN KEY (candidate_id) REFERENCES candidate (id) ON DELETE CASCADE,
    CONSTRAINT fk_candidate_tag_tag       FOREIGN KEY (tag_id)       REFERENCES tag (id)       ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_candidate_tag_tag_id ON candidate_tag (tag_id);

-- Seed tags — `ON CONFLICT DO NOTHING` makes the insert safe on re-runs.
INSERT INTO tag (name, color) VALUES
  ('Top Pick',        '#22c55e'),
  ('Referral',        '#3b82f6'),
  ('Senior',          '#a855f7'),
  ('Remote OK',       '#0ea5e9'),
  ('Needs Follow-up', '#f59e0b'),
  ('Reschedule',      '#ef4444')
ON CONFLICT (name) DO NOTHING;
