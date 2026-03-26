package com.clarksprojects.ecommerce.controller;

import com.clarksprojects.ecommerce.dao.OrderRepository;
import com.clarksprojects.ecommerce.entity.Order;
import com.clarksprojects.ecommerce.security.jwt.JwtUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.Date;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderRepository orderRepository;

    @Autowired
    private JwtUtils jwtUtils;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    void getOrderHistory_shouldReturnOrdersForAuthenticatedUser() throws Exception {
        String token = jwtUtils.generateToken("user@example.com");

        when(userDetailsService.loadUserByUsername("user@example.com"))
                .thenReturn(new org.springframework.security.core.userdetails.User(
                        "user@example.com", "encoded", Collections.emptyList()));

        Order order = new Order();
        order.setId(1L);
        order.setOrderTrackingNumber("track-001");
        order.setTotalPrice(new BigDecimal("59.99"));
        order.setTotalQuantity(3);
        order.setStatus("shipped");
        order.setDateCreated(new Date());

        when(orderRepository.findByCustomerEmailOrderByDateCreatedDesc("user@example.com"))
                .thenReturn(List.of(order));

        mockMvc.perform(get("/api/orders")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].orderTrackingNumber").value("track-001"))
                .andExpect(jsonPath("$[0].totalPrice").value(59.99));
    }

    @Test
    void getOrderHistory_shouldReturnEmptyListWhenNoOrders() throws Exception {
        String token = jwtUtils.generateToken("noorders@example.com");

        when(userDetailsService.loadUserByUsername("noorders@example.com"))
                .thenReturn(new org.springframework.security.core.userdetails.User(
                        "noorders@example.com", "encoded", Collections.emptyList()));

        when(orderRepository.findByCustomerEmailOrderByDateCreatedDesc("noorders@example.com"))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/orders")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }
}
