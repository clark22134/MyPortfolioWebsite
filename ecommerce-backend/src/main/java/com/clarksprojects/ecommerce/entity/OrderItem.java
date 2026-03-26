package com.clarksprojects.ecommerce.entity;

import java.math.BigDecimal;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;


@Entity
@Table(name = "order_item")
@Getter
@Setter
public class OrderItem {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @Column(name = "image_url")
  private String imageUrl;

  @Column(name = "unit_price")
  private BigDecimal unitPrice;

  @Column(name = "quantity")
  private int quantity;

  @Column(name = "product_id")
  private Long productId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "product_id", insertable = false, updatable = false)
  @JsonIgnore
  private Product product;

  @JsonIgnore
  @ManyToOne
  @JoinColumn(name = "order_id")
  private Order order;

  @JsonProperty("productName")
  public String getProductName() {
    return product != null ? product.getName() : null;
  }

  public void setOrder(Order order) {
    this.order = order;
  }


}
