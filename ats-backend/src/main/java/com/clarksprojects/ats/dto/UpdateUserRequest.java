package com.clarksprojects.ats.dto;

import com.clarksprojects.ats.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateUserRequest {

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(max = 255)
    private String fullName;

    @NotNull
    private Role role;

    @NotNull
    private Boolean enabled;
}
