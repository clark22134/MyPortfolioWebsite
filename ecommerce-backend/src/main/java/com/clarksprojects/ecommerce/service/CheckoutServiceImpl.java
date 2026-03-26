package com.clarksprojects.ecommerce.service;

import java.util.Set;
import java.util.UUID;

import javax.transaction.Transactional;

import org.springframework.stereotype.Service;

import com.clarksprojects.ecommerce.dao.CustomerRepository;
import com.clarksprojects.ecommerce.dto.Purchase;
import com.clarksprojects.ecommerce.dto.PurchaseResponse;
import com.clarksprojects.ecommerce.entity.Customer;
import com.clarksprojects.ecommerce.entity.Order;
import com.clarksprojects.ecommerce.entity.OrderItem;

@Service
public class CheckoutServiceImpl implements CheckoutService {

  private CustomerRepository customerRepository;

  // automatically autowired by Spring Boot, injecting the dependency customerRepository
  public CheckoutServiceImpl(CustomerRepository customerRepository) {
    this.customerRepository = customerRepository;
  }

  @Override
  @Transactional
  public PurchaseResponse placeOrder(Purchase purchase) {
      
    Order order = purchase.getOrder();

    String orderTrackingNumber = generateOrderTrackingNumber();
    order.setOrderTrackingNumber(orderTrackingNumber);

    Set<OrderItem> orderItems = purchase.getOrderItems();
    orderItems.forEach(item -> order.add(item));

    order.setBillingAddress(purchase.getBillingAddress());
    order.setShippingAddress(purchase.getShippingAddress());
    
    // Look up existing registered customer by email, or use the guest customer data
    Customer customer = purchase.getCustomer();
    String theEmail = customer.getEmail();
    Customer existingCustomer = customerRepository.findByEmail(theEmail).orElse(null);

    if (existingCustomer != null) {
      customer = existingCustomer;
    }

    customer.add(order);
    customerRepository.save(customer);

    return new PurchaseResponse(orderTrackingNumber);
  }

  private String generateOrderTrackingNumber() {
    // generate a random UUID number (UUID version-4)
    return  UUID.randomUUID().toString();
  }

}
