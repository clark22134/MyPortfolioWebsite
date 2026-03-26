package com.clarksprojects.ecommerce.dao;

import com.clarksprojects.ecommerce.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByCustomerEmailOrderByDateCreatedDesc(String email);
}
