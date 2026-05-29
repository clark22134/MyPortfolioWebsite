package com.clarksprojects.ats.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NoteRequest {
    @NotNull
    private Long candidateId;

    @NotBlank
    @Size(max = 5000, message = "Note must be 5000 characters or fewer")
    private String body;
}
