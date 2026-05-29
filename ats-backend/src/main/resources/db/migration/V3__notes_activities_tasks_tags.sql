-- HireFlow ATS — Notes, activity log, tasks/follow-ups, and tags

-- Threaded notes on a candidate, authored by a user.
CREATE TABLE candidate_note (
    id           BIGSERIAL PRIMARY KEY,
    candidate_id BIGINT       NOT NULL,
    author_id    BIGINT,
    body         TEXT         NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_note_candidate FOREIGN KEY (candidate_id) REFERENCES candidate (id) ON DELETE CASCADE,
    CONSTRAINT fk_note_author    FOREIGN KEY (author_id)    REFERENCES app_user (id) ON DELETE SET NULL
);

CREATE INDEX idx_candidate_note_candidate_id ON candidate_note (candidate_id);
CREATE INDEX idx_candidate_note_created_at ON candidate_note (created_at);

-- Append-only activity log. Either candidate_id or job_id (or both) may be set.
CREATE TABLE activity (
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

CREATE INDEX idx_activity_candidate_id ON activity (candidate_id);
CREATE INDEX idx_activity_job_id ON activity (job_id);
CREATE INDEX idx_activity_actor_id ON activity (actor_id);
CREATE INDEX idx_activity_type ON activity (type);
CREATE INDEX idx_activity_created_at ON activity (created_at DESC);

-- Follow-up tasks. Either a free-standing reminder or linked to a candidate/job.
CREATE TABLE task (
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

CREATE INDEX idx_task_status   ON task (status);
CREATE INDEX idx_task_assignee ON task (assignee_id);
CREATE INDEX idx_task_due_at   ON task (due_at);
CREATE INDEX idx_task_candidate_id ON task (candidate_id);

-- Tags applied to candidates (many-to-many).
CREATE TABLE tag (
    id    BIGSERIAL PRIMARY KEY,
    name  VARCHAR(64) NOT NULL UNIQUE,
    color VARCHAR(16)
);

CREATE TABLE candidate_tag (
    candidate_id BIGINT NOT NULL,
    tag_id       BIGINT NOT NULL,
    PRIMARY KEY (candidate_id, tag_id),
    CONSTRAINT fk_candidate_tag_candidate FOREIGN KEY (candidate_id) REFERENCES candidate (id) ON DELETE CASCADE,
    CONSTRAINT fk_candidate_tag_tag       FOREIGN KEY (tag_id)       REFERENCES tag (id)       ON DELETE CASCADE
);

CREATE INDEX idx_candidate_tag_tag_id ON candidate_tag (tag_id);

-- Seed tags
INSERT INTO tag (name, color) VALUES
  ('Top Pick',      '#22c55e'),
  ('Referral',      '#3b82f6'),
  ('Senior',        '#a855f7'),
  ('Remote OK',     '#0ea5e9'),
  ('Needs Follow-up','#f59e0b'),
  ('Reschedule',    '#ef4444');
