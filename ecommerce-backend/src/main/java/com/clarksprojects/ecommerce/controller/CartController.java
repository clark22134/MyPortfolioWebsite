package com.clarksprojects.ecommerce.controller;

import com.clarksprojects.ecommerce.dto.CartItemDto;
import com.clarksprojects.ecommerce.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public List<CartItemDto> getCart(Principal principal) {
        return cartService.getCart(principal.getName());
    }

    @PutMapping
    public List<CartItemDto> saveCart(Principal principal, @RequestBody List<CartItemDto> items) {
        return cartService.saveCart(principal.getName(), items);
    }
}
