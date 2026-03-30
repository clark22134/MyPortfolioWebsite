package com.clarksprojects.ecommerce.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.CascadeType;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "orders")
@Getter
@Setter
public class Order {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @Column(name = "order_tracking_number")
  private String orderTrackingNumber;

  @Column(name = "total_price")
  private BigDecimal totalPrice;

  @Enumerated(EnumType.STRING)
  @Column(name = "status")
  private OrderStatus status;

  @Column(name = "total_quantity")
  private int totalQuantity;

  @Column(name = "date_created")
  @CreationTimestamp
  private LocalDateTime dateCreated;

  @Column(name = "last_updated")
  @UpdateTimestamp
  private LocalDateTime lastUpdated;

  @OneToMany(cascade = CascadeType.ALL, mappedBy = "order")
  private Set<OrderItem> orderItems = new HashSet<>();

  @JsonIgnore
  @ManyToOne
  @JoinColumn(name = "customer_id")
  private Customer customer;

  @OneToOne(cascade = CascadeType.ALL)
  @JoinColumn(name = "shipping_address_id", referencedColumnName = "id")
  private Address shippingAddress;

  @OneToOne(cascade = CascadeType.ALL)
  @JoinColumn(name = "billing_address_id", referencedColumnName = "id")
  private Address billingAddress;

  public void add(OrderItem item) {
    if (item != null) {
      if (orderItems == null) {
        orderItems = new HashSet<>();
      }
      orderItems.add(item);
      item.setOrder(this);
    }
  }


}
