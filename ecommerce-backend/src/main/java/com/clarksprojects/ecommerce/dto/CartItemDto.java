package com.clarksprojects.ecommerce.dto;

import java.math.BigDecimal;

public record CartItemDto(
    Long productId,
    String name,
    BigDecimal unitPrice,
    int quantity,
    String imageUrl
) {}
