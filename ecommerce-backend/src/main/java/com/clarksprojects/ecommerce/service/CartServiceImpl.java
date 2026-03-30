package com.clarksprojects.ecommerce.service;

import com.clarksprojects.ecommerce.dto.CartItemDto;
import com.clarksprojects.ecommerce.entity.CartItem;
import com.clarksprojects.ecommerce.entity.Customer;
import com.clarksprojects.ecommerce.entity.Product;
import com.clarksprojects.ecommerce.repository.CartItemRepository;
import com.clarksprojects.ecommerce.repository.CustomerRepository;
import com.clarksprojects.ecommerce.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CartServiceImpl implements CartService {

    private final CartItemRepository cartItemRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CartItemDto> getCart(String email) {
        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        return cartItemRepository.findByCustomerId(customer.getId()).stream()
                .map(item -> new CartItemDto(
                        item.getProduct().getId(),
                        item.getProduct().getName(),
                        item.getProduct().getUnitPrice(),
                        item.getQuantity(),
                        item.getProduct().getImageUrl()
                ))
                .toList();
    }

    @Override
    @Transactional
    public List<CartItemDto> saveCart(String email, List<CartItemDto> items) {
        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        // Remove existing cart items for this customer
        cartItemRepository.deleteByCustomerId(customer.getId());
        cartItemRepository.flush();

        if (items == null || items.isEmpty()) {
            return List.of();
        }

        // Collect product IDs and fetch all products in one query
        List<Long> productIds = items.stream()
                .map(CartItemDto::productId)
                .toList();
        Map<Long, Product> productMap = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

        List<CartItem> cartItems = new ArrayList<>();
        for (CartItemDto dto : items) {
            Product product = productMap.get(dto.productId());
            if (product == null) {
                continue; // skip items referencing deleted products
            }
            CartItem cartItem = new CartItem();
            cartItem.setCustomer(customer);
            cartItem.setProduct(product);
            cartItem.setQuantity(dto.quantity());
            cartItems.add(cartItem);
        }

        cartItemRepository.saveAll(cartItems);

        return cartItems.stream()
                .map(item -> new CartItemDto(
                        item.getProduct().getId(),
                        item.getProduct().getName(),
                        item.getProduct().getUnitPrice(),
                        item.getQuantity(),
                        item.getProduct().getImageUrl()
                ))
                .toList();
    }
}
