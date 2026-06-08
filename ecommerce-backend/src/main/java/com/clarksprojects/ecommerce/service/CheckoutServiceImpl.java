package com.clarksprojects.ecommerce.service;

import java.math.BigDecimal;
import java.util.Set;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.clarksprojects.ecommerce.repository.CustomerRepository;
import com.clarksprojects.ecommerce.repository.ProductRepository;
import com.clarksprojects.ecommerce.dto.Purchase;
import com.clarksprojects.ecommerce.dto.PurchaseResponse;
import com.clarksprojects.ecommerce.entity.Customer;
import com.clarksprojects.ecommerce.entity.Order;
import com.clarksprojects.ecommerce.entity.OrderItem;
import com.clarksprojects.ecommerce.entity.OrderStatus;
import com.clarksprojects.ecommerce.entity.Product;
import com.clarksprojects.ecommerce.exception.InvalidPurchaseException;

@Service
@RequiredArgsConstructor
@Slf4j
public class CheckoutServiceImpl implements CheckoutService {

  private final CustomerRepository customerRepository;
  private final ProductRepository productRepository;

  @Override
  @Transactional
  public PurchaseResponse placeOrder(Purchase purchase, String authenticatedEmail) {

    Order order = purchase.order();
    order.setOrderTrackingNumber(UUID.randomUUID().toString());
    order.setStatus(OrderStatus.PROCESSING);

    // Never trust client-supplied prices or totals. Re-price every line item
    // against the authoritative Product record and recompute the order totals
    // server-side, so a tampered request cannot dictate what it pays.
    Set<OrderItem> orderItems = purchase.orderItems();
    if (orderItems == null || orderItems.isEmpty()) {
      throw new InvalidPurchaseException("Order must contain at least one item");
    }

    BigDecimal totalPrice = BigDecimal.ZERO;
    int totalQuantity = 0;

    for (OrderItem item : orderItems) {
      if (item.getQuantity() <= 0) {
        throw new InvalidPurchaseException("Item quantity must be greater than zero");
      }
      if (item.getProductId() == null) {
        throw new InvalidPurchaseException("Each order item must reference a product");
      }

      Product product = productRepository.findById(item.getProductId())
          .orElseThrow(() -> new InvalidPurchaseException(
              "Product not found: " + item.getProductId()));
      if (!product.isActive()) {
        throw new InvalidPurchaseException("Product is not available: " + item.getProductId());
      }

      // Authoritative unit price from the catalog, ignoring whatever the client sent.
      item.setUnitPrice(product.getUnitPrice());

      totalPrice = totalPrice.add(product.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
      totalQuantity += item.getQuantity();

      order.add(item);
    }

    order.setTotalPrice(totalPrice);
    order.setTotalQuantity(totalQuantity);

    order.setBillingAddress(purchase.billingAddress());
    order.setShippingAddress(purchase.shippingAddress());

    // Prefer the authenticated email so the order links to the right account;
    // fall back to the form-provided email for guest checkouts.
    String email = (authenticatedEmail != null) ? authenticatedEmail : purchase.customer().getEmail();
    Customer customer = customerRepository.findByEmail(email).orElse(purchase.customer());

    // Never store full card numbers — only retain last 4 digits
    customer.maskCardNumber();

    customer.add(order);
    customerRepository.save(customer);

    log.info("Order placed successfully: trackingNumber={}, email={}, total={}",
        order.getOrderTrackingNumber(), email, totalPrice);
    return new PurchaseResponse(order.getOrderTrackingNumber());
  }
}
