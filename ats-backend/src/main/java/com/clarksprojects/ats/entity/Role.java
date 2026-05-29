package com.clarksprojects.ats.entity;

/**
 * Authorization roles for the ATS.
 *
 * <ul>
 *   <li>{@link #ADMIN} — full access, including user management.</li>
 *   <li>{@link #RECRUITER} — full candidate/job/pipeline write access.</li>
 *   <li>{@link #HIRING_MANAGER} — read-only on jobs/candidates, can add notes
 *       and complete tasks assigned to them.</li>
 * </ul>
 */
public enum Role {
    ADMIN,
    RECRUITER,
    HIRING_MANAGER;

    public String authority() {
        return "ROLE_" + name();
    }
}
