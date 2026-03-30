package com.clarksprojects.ats.dto;

import java.util.List;

public record TopCandidateMatch(
        Long candidateId,
        String firstName,
        String lastName,
        String email,
        int skillsMatchPercent,
        int daysWorkedScore,
        double distanceMiles,
        List<String> matchedSkills,
        List<String> candidateSkills
) {}
