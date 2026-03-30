package com.clarksprojects.ecommerce.dto;

import java.util.Set;

import com.clarksprojects.ecommerce.entity.Address;
import com.clarksprojects.ecommerce.entity.Customer;
import com.clarksprojects.ecommerce.entity.Order;
import com.clarksprojects.ecommerce.entity.OrderItem;

public record Purchase(
    Customer customer,
    Address shippingAddress,
    Address billingAddress,
    Order order,
    Set<OrderItem> orderItems
) {}
