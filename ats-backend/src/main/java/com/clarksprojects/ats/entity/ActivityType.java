package com.clarksprojects.ats.entity;

/**
 * Type of an Activity log entry. Strings stored in the DB so adding new types
 * is backwards-compatible with old rows.
 */
public enum ActivityType {
    CANDIDATE_CREATED,
    CANDIDATE_UPDATED,
    CANDIDATE_DELETED,
    STAGE_CHANGED,
    NOTE_ADDED,
    TAG_ADDED,
    TAG_REMOVED,
    JOB_CREATED,
    JOB_UPDATED,
    JOB_DELETED,
    TASK_CREATED,
    TASK_COMPLETED,
    TASK_CANCELLED,
    RESUME_UPLOADED
}
