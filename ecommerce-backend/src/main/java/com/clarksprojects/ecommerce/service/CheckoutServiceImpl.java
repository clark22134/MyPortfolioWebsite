package com.clarksprojects.ecommerce.service;

import java.util.Set;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.clarksprojects.ecommerce.repository.CustomerRepository;
import com.clarksprojects.ecommerce.dto.Purchase;
import com.clarksprojects.ecommerce.dto.PurchaseResponse;
import com.clarksprojects.ecommerce.entity.Customer;
import com.clarksprojects.ecommerce.entity.Order;
import com.clarksprojects.ecommerce.entity.OrderItem;
import com.clarksprojects.ecommerce.entity.OrderStatus;

@Service
@RequiredArgsConstructor
@Slf4j
public class CheckoutServiceImpl implements CheckoutService {

  private final CustomerRepository customerRepository;

  @Override
  @Transactional
  public PurchaseResponse placeOrder(Purchase purchase, String authenticatedEmail) {

    Order order = purchase.order();
    order.setOrderTrackingNumber(generateOrderTrackingNumber());
    order.setStatus(OrderStatus.PROCESSING);

    Set<OrderItem> orderItems = purchase.orderItems();
    orderItems.forEach(order::add);

    order.setBillingAddress(purchase.billingAddress());
    order.setShippingAddress(purchase.shippingAddress());

    // Use the authenticated email when available to ensure order is linked
    // to the correct customer account; fall back to form email for guests
    String email = (authenticatedEmail != null) ? authenticatedEmail : purchase.customer().getEmail();
    Customer customer = customerRepository.findByEmail(email).orElse(purchase.customer());

    // Never store full card numbers — only retain last 4 digits
    customer.maskCardNumber();

    customer.add(order);
    customerRepository.save(customer);

    log.info("Order placed successfully: trackingNumber={}, email={}", order.getOrderTrackingNumber(), email);
    return new PurchaseResponse(order.getOrderTrackingNumber());
  }

  private String generateOrderTrackingNumber() {
    return UUID.randomUUID().toString();
  }
}
