package com.clarksprojects.ecommerce.controller;

import com.clarksprojects.ecommerce.entity.Address;
import com.clarksprojects.ecommerce.entity.Customer;
import com.clarksprojects.ecommerce.repository.CustomerRepository;
import com.clarksprojects.ecommerce.security.jwt.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests for authenticated Auth endpoints (getProfile, logout).
 * Uses real JWT tokens so the security filter chain works end-to-end.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerAuthenticatedTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtils jwtUtils;

    @MockitoBean
    private CustomerRepository customerRepository;

    @MockitoBean
    private UserDetailsService userDetailsService;

    private String token;

    @BeforeEach
    void setUp() {
        token = jwtUtils.generateToken("profile@example.com");
        when(userDetailsService.loadUserByUsername("profile@example.com"))
                .thenReturn(new org.springframework.security.core.userdetails.User(
                        "profile@example.com", "encoded", Collections.emptyList()));
    }

    // ── getProfile ─────────────────────────────────────────────────────────────

    @Test
    void getProfile_withValidToken_returnsCustomerProfile() throws Exception {
        Customer customer = new Customer();
        customer.setEmail("profile@example.com");
        customer.setFirstName("Clark");
        customer.setLastName("Foster");

        when(customerRepository.findByEmail("profile@example.com")).thenReturn(Optional.of(customer));

        mockMvc.perform(get("/api/auth/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("profile@example.com"))
                .andExpect(jsonPath("$.firstName").value("Clark"))
                .andExpect(jsonPath("$.lastName").value("Foster"));
    }

    @Test
    void getProfile_withShippingAddress_includesAddressInResponse() throws Exception {
        Address shipping = new Address();
        shipping.setStreet("123 Main St");
        shipping.setCity("San Jose");
        shipping.setState("CA");
        shipping.setZipCode("95101");
        shipping.setCountry("US");

        Customer customer = new Customer();
        customer.setEmail("profile@example.com");
        customer.setFirstName("Jane");
        customer.setLastName("Doe");
        customer.setDefaultShippingAddress(shipping);

        when(customerRepository.findByEmail("profile@example.com")).thenReturn(Optional.of(customer));

        mockMvc.perform(get("/api/auth/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.defaultShippingAddress.city").value("San Jose"))
                .andExpect(jsonPath("$.defaultShippingAddress.state").value("CA"))
                .andExpect(jsonPath("$.defaultShippingAddress.street").value("123 Main St"));
    }

    @Test
    void getProfile_withCardInfo_includesCardDetailsInResponse() throws Exception {
        Customer customer = new Customer();
        customer.setEmail("profile@example.com");
        customer.setFirstName("John");
        customer.setLastName("Cardholder");
        customer.setCardNumber("4242");
        customer.setCardType("Visa");
        customer.setNameOnCard("John Cardholder");
        customer.setCardExpirationMonth(12);
        customer.setCardExpirationYear(2027);

        when(customerRepository.findByEmail("profile@example.com")).thenReturn(Optional.of(customer));

        mockMvc.perform(get("/api/auth/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cardType").value("Visa"))
                .andExpect(jsonPath("$.cardNumberLast4").value("4242"))
                .andExpect(jsonPath("$.cardExpirationMonth").value(12))
                .andExpect(jsonPath("$.cardExpirationYear").value(2027));
    }

    @Test
    void getProfile_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/auth/profile"))
                .andExpect(status().isUnauthorized());
    }

    // ── logout ─────────────────────────────────────────────────────────────────

    @Test
    void logout_withValidToken_returns200AndSetsClearCookie() throws Exception {
        mockMvc.perform(post("/api/auth/logout")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("Max-Age=0")));
    }

    @Test
    void logout_withoutToken_returns401() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isUnauthorized());
    }
}
