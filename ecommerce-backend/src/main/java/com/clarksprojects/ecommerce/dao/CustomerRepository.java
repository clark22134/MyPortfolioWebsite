package com.clarksprojects.ecommerce.dao;

import org.springframework.data.jpa.repository.JpaRepository;

import com.clarksprojects.ecommerce.entity.Customer;

import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByEmail(String email);

    boolean existsByEmail(String email);
} 
