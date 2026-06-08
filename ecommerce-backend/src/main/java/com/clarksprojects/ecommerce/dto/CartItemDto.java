package com.clarksprojects.ecommerce.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CartItemDto(
    @NotNull(message = "productId is required") Long productId,
    String name,
    BigDecimal unitPrice,
    @Min(value = 1, message = "quantity must be at least 1") int quantity,
    String imageUrl
) {}
