package com.clarksprojects.ats.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TagRequest {

    @NotBlank
    @Size(max = 64)
    private String name;

    @Pattern(regexp = "^#[0-9a-fA-F]{6}$|^$", message = "Color must be a hex value like #6366f1")
    @Size(max = 16)
    private String color;
}
