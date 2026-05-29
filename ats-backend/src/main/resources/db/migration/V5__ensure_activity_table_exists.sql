-- Ensure `activity` exists even when earlier migrations were recorded but not fully applied.
-- This migration is intentionally idempotent and safe to run on already-correct schemas.

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
