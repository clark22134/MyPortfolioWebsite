package com.clarksprojects.ecommerce.controller;

import com.clarksprojects.ecommerce.dto.Purchase;
import com.clarksprojects.ecommerce.dto.PurchaseResponse;
import com.clarksprojects.ecommerce.service.CheckoutService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.clarksprojects.ecommerce.entity.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
class CheckoutControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CheckoutService checkoutService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void placeOrder_shouldReturnTrackingNumber() throws Exception {
        when(checkoutService.placeOrder(any(Purchase.class), any()))
                .thenReturn(new PurchaseResponse("test-tracking-123"));

        Purchase purchase = buildPurchase();

        mockMvc.perform(post("/api/checkout/purchase")
                        .with(user("jane@example.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(purchase)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.orderTrackingNumber").value("test-tracking-123"));
    }

    @Test
    void placeOrder_shouldAcceptValidPurchase() throws Exception {
        when(checkoutService.placeOrder(any(Purchase.class), any()))
                .thenReturn(new PurchaseResponse("uuid-1234"));

        Purchase purchase = buildPurchase();

        mockMvc.perform(post("/api/checkout/purchase")
                        .with(user("jane@example.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(purchase)))
                .andExpect(status().isCreated());
    }

    private Purchase buildPurchase() {
        Customer customer = new Customer();
        customer.setFirstName("Jane");
        customer.setLastName("Doe");
        customer.setEmail("jane@example.com");

        Order order = new Order();
        order.setTotalPrice(new BigDecimal("29.99"));
        order.setTotalQuantity(1);

        OrderItem item = new OrderItem();
        item.setUnitPrice(new BigDecimal("29.99"));
        item.setQuantity(1);
        item.setProductId(1L);

        Set<OrderItem> items = new HashSet<>();
        items.add(item);

        Address address = new Address();
        address.setStreet("123 Test St");
        address.setCity("Test City");
        address.setState("TS");
        address.setCountry("US");
        address.setZipCode("12345");

        Purchase purchase = new Purchase(customer, address, address, order, items);
        return purchase;
    }
}
