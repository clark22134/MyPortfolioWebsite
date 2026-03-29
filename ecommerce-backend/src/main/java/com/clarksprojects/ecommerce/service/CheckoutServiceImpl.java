package com.clarksprojects.ecommerce.service;

import java.util.Set;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.clarksprojects.ecommerce.dao.CustomerRepository;
import com.clarksprojects.ecommerce.dto.Purchase;
import com.clarksprojects.ecommerce.dto.PurchaseResponse;
import com.clarksprojects.ecommerce.entity.Customer;
import com.clarksprojects.ecommerce.entity.Order;
import com.clarksprojects.ecommerce.entity.OrderItem;

@Service
@RequiredArgsConstructor
public class CheckoutServiceImpl implements CheckoutService {

  private final CustomerRepository customerRepository;

  @Override
  @Transactional
  public PurchaseResponse placeOrder(Purchase purchase, String authenticatedEmail) {

    Order order = purchase.getOrder();
    order.setOrderTrackingNumber(generateOrderTrackingNumber());
    order.setStatus("Processing");

    Set<OrderItem> orderItems = purchase.getOrderItems();
    orderItems.forEach(order::add);

    order.setBillingAddress(purchase.getBillingAddress());
    order.setShippingAddress(purchase.getShippingAddress());

    // Use the authenticated email when available to ensure order is linked
    // to the correct customer account; fall back to form email for guests
    String email = (authenticatedEmail != null) ? authenticatedEmail : purchase.getCustomer().getEmail();
    Customer customer = customerRepository.findByEmail(email).orElse(purchase.getCustomer());
    customer.add(order);
    customerRepository.save(customer);

    return new PurchaseResponse(order.getOrderTrackingNumber());
  }

  private String generateOrderTrackingNumber() {
    return UUID.randomUUID().toString();
  }
}
