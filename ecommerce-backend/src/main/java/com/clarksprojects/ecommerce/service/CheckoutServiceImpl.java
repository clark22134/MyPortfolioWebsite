package com.clarksprojects.ecommerce.service;

import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.clarksprojects.ecommerce.dao.CustomerRepository;
import com.clarksprojects.ecommerce.dto.Purchase;
import com.clarksprojects.ecommerce.dto.PurchaseResponse;
import com.clarksprojects.ecommerce.entity.Customer;
import com.clarksprojects.ecommerce.entity.Order;
import com.clarksprojects.ecommerce.entity.OrderItem;

@Service
public class CheckoutServiceImpl implements CheckoutService {

  private final CustomerRepository customerRepository;

  public CheckoutServiceImpl(CustomerRepository customerRepository) {
    this.customerRepository = customerRepository;
  }

  @Override
  @Transactional
  public PurchaseResponse placeOrder(Purchase purchase) {

    Order order = purchase.getOrder();
    order.setOrderTrackingNumber(generateOrderTrackingNumber());

    Set<OrderItem> orderItems = purchase.getOrderItems();
    orderItems.forEach(order::add);

    order.setBillingAddress(purchase.getBillingAddress());
    order.setShippingAddress(purchase.getShippingAddress());

    String email = purchase.getCustomer().getEmail();
    Customer customer = customerRepository.findByEmail(email).orElse(purchase.getCustomer());
    customer.add(order);
    customerRepository.save(customer);

    return new PurchaseResponse(order.getOrderTrackingNumber());
  }

  private String generateOrderTrackingNumber() {
    return UUID.randomUUID().toString();
  }
}
