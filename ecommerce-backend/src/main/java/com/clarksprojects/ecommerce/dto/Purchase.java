package com.clarksprojects.ecommerce.dto;

import java.util.Set;

import com.clarksprojects.ecommerce.entity.Address;
import com.clarksprojects.ecommerce.entity.Customer;
import com.clarksprojects.ecommerce.entity.Order;
import com.clarksprojects.ecommerce.entity.OrderItem;

import lombok.Data;

@Data
public class Purchase {

  private Customer customer;
  private Address shippingAddress;
  private Address billingAddress;
  private Order order;
  private Set<OrderItem> orderItems;

}
