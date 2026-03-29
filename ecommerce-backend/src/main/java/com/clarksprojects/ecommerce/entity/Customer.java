package com.clarksprojects.ecommerce.entity;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "customer")
@Getter
@Setter
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;
  
    @Column(name = "first_name")
    private String firstName;
  
    @Column(name = "last_name")
    private String lastName;
  
    @Column(name = "email")
    private String email;

    @Column(name = "password")
    private String password;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "default_shipping_address_id", referencedColumnName = "id")
    private Address defaultShippingAddress;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "default_billing_address_id", referencedColumnName = "id")
    private Address defaultBillingAddress;

    @Column(name = "card_type")
    private String cardType;

    @Column(name = "name_on_card")
    private String nameOnCard;

    @Column(name = "card_number")
    private String cardNumber;

    @Column(name = "card_expiration_month")
    private Integer cardExpirationMonth;

    @Column(name = "card_expiration_year")
    private Integer cardExpirationYear;

    /**
     * Masks the card number to only retain the last 4 digits.
     * Must be called before persisting to prevent storing full card numbers.
     */
    public void maskCardNumber() {
        if (this.cardNumber != null && this.cardNumber.length() > 4) {
            this.cardNumber = this.cardNumber.substring(this.cardNumber.length() - 4);
        }
    }

    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL)
    private Set<Order> orders = new HashSet<>();

    public void add(Order order) {
        if (order != null) {
            if (orders == null) {
                orders = new HashSet<>();
            }
            orders.add(order);
            order.setCustomer(this);
        }
    }

}
