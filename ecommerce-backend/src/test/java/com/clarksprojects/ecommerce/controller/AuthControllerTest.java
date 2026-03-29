package com.clarksprojects.ecommerce.controller;

import com.clarksprojects.ecommerce.dao.CustomerRepository;
import com.clarksprojects.ecommerce.dto.LoginRequest;
import com.clarksprojects.ecommerce.dto.RegisterRequest;
import com.clarksprojects.ecommerce.entity.Customer;
import com.clarksprojects.ecommerce.security.jwt.JwtUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthenticationManager authenticationManager;

    @MockitoBean
    private CustomerRepository customerRepository;

    @MockitoBean
    private JwtUtils jwtUtils;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void login_shouldReturnToken() throws Exception {
        Authentication auth = mock(Authentication.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(auth);
        when(jwtUtils.generateToken("test@example.com")).thenReturn("mock-jwt-token");

        LoginRequest request = new LoginRequest();
        request.setEmail("test@example.com");
        request.setPassword("password123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("mock-jwt-token"))
                .andExpect(jsonPath("$.email").value("test@example.com"));
    }

    @Test
    void login_shouldReturn401ForInvalidCredentials() throws Exception {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Invalid credentials"));

        LoginRequest request = new LoginRequest();
        request.setEmail("bad@example.com");
        request.setPassword("wrong");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void register_shouldReturnTokenForNewUser() throws Exception {
        when(customerRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(customerRepository.save(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtUtils.generateToken("new@example.com")).thenReturn("new-jwt-token");

        RegisterRequest request = new RegisterRequest();
        request.setEmail("new@example.com");
        request.setPassword("securePass123");
        request.setFirstName("New");
        request.setLastName("User");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("new-jwt-token"))
                .andExpect(jsonPath("$.email").value("new@example.com"));
    }

    @Test
    void register_shouldReturn400ForDuplicateEmail() throws Exception {
        when(customerRepository.existsByEmail("existing@example.com")).thenReturn(true);

        RegisterRequest request = new RegisterRequest();
        request.setEmail("existing@example.com");
        request.setPassword("password123");
        request.setFirstName("Existing");
        request.setLastName("User");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getProfile_shouldReturn403WhenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/api/auth/profile"))
                .andExpect(status().isForbidden());
    }

    @Test
    void register_shouldAcceptShippingAddress() throws Exception {
        when(customerRepository.existsByEmail("withaddr@example.com")).thenReturn(false);
        when(customerRepository.save(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtUtils.generateToken("withaddr@example.com")).thenReturn("addr-jwt-token");

        RegisterRequest request = new RegisterRequest();
        request.setEmail("withaddr@example.com");
        request.setPassword("securePass123");
        request.setFirstName("With");
        request.setLastName("Address");

        RegisterRequest.AddressDto shipping = new RegisterRequest.AddressDto();
        shipping.setStreet("100 Test Blvd");
        shipping.setCity("TestCity");
        shipping.setState("CA");
        shipping.setZipCode("90210");
        shipping.setCountry("US");
        request.setShippingAddress(shipping);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("addr-jwt-token"));
    }
}
