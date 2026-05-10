package com.clarksprojects.ecommerce.controller;

import com.clarksprojects.ecommerce.dto.CartItemDto;
import com.clarksprojects.ecommerce.security.jwt.JwtUtils;
import com.clarksprojects.ecommerce.service.CartService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class CartControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtils jwtUtils;

    @MockitoBean
    private CartService cartService;

    @MockitoBean
    private UserDetailsService userDetailsService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private String token;

    @BeforeEach
    void setUp() {
        token = jwtUtils.generateToken("cart@example.com");
        when(userDetailsService.loadUserByUsername("cart@example.com"))
                .thenReturn(new org.springframework.security.core.userdetails.User(
                        "cart@example.com", "encoded", Collections.emptyList()));
    }

    @Test
    void getCart_shouldReturnCurrentUserCart() throws Exception {
        CartItemDto item = new CartItemDto(1L, "Widget", new BigDecimal("9.99"), 2, "/img/w.jpg");
        when(cartService.getCart("cart@example.com")).thenReturn(List.of(item));

        mockMvc.perform(get("/api/cart")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].productId").value(1))
                .andExpect(jsonPath("$[0].name").value("Widget"))
                .andExpect(jsonPath("$[0].quantity").value(2));
    }

    @Test
    void getCart_emptyCart_returnsEmptyArray() throws Exception {
        when(cartService.getCart("cart@example.com")).thenReturn(List.of());

        mockMvc.perform(get("/api/cart")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void getCart_noAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/cart"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void saveCart_shouldReturnSavedItems() throws Exception {
        CartItemDto dto = new CartItemDto(5L, "Gadget", new BigDecimal("19.99"), 1, "/img/g.jpg");
        when(cartService.saveCart(eq("cart@example.com"), any())).thenReturn(List.of(dto));

        mockMvc.perform(put("/api/cart")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(dto))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].productId").value(5))
                .andExpect(jsonPath("$[0].name").value("Gadget"));
    }

    @Test
    void saveCart_emptyBody_returnsEmptyList() throws Exception {
        when(cartService.saveCart(eq("cart@example.com"), any())).thenReturn(List.of());

        mockMvc.perform(put("/api/cart")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[]"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }
}
