package com.portfolio.backend.dto;

public record LoginResponse(
    String token,
    String username,
    String email,
    String fullName
) {}
