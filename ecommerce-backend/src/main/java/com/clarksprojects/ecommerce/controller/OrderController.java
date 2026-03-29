package com.clarksprojects.ecommerce.controller;

import com.clarksprojects.ecommerce.dao.OrderRepository;
import com.clarksprojects.ecommerce.entity.Order;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderRepository orderRepository;

    @GetMapping
    public List<Order> getOrderHistory(Principal principal) {
        return orderRepository.findByCustomerEmailOrderByDateCreatedDesc(principal.getName());
    }
}
