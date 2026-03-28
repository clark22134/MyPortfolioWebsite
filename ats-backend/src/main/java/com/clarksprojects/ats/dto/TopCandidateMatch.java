package com.clarksprojects.ats.dto;

import lombok.*;

import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class TopCandidateMatch {
    private Long candidateId;
    private String firstName;
    private String lastName;
    private String email;
    private int matchPercent;
    private List<String> matchedSkills;
    private List<String> candidateSkills;
}
