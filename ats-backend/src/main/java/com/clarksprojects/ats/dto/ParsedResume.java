package com.clarksprojects.ats.dto;

public record ParsedResume(
        String firstName,
        String lastName,
        String email,
        String phone,
        String skills,
        String rawText) {
}
