package com.clarksprojects.ecommerce.service;

import com.clarksprojects.ecommerce.dto.CartItemDto;

import java.util.List;

public interface CartService {

    List<CartItemDto> getCart(String email);

    List<CartItemDto> saveCart(String email, List<CartItemDto> items);
}
