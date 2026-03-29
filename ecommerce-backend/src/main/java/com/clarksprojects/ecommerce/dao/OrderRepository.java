package com.clarksprojects.ecommerce.dao;

import com.clarksprojects.ecommerce.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("SELECT DISTINCT o FROM Order o " +
           "LEFT JOIN FETCH o.orderItems oi " +
           "LEFT JOIN FETCH oi.product " +
           "LEFT JOIN FETCH o.shippingAddress " +
           "LEFT JOIN FETCH o.billingAddress " +
           "WHERE o.customer.email = :email " +
           "ORDER BY o.dateCreated DESC")
    List<Order> findByCustomerEmailOrderByDateCreatedDesc(@Param("email") String email);
}
