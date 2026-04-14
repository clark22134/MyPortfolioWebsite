package com.clarksprojects.ecommerce.controller;

import com.clarksprojects.ecommerce.repository.CustomerRepository;
import com.clarksprojects.ecommerce.dto.LoginRequest;
import com.clarksprojects.ecommerce.dto.RegisterRequest;
import com.clarksprojects.ecommerce.entity.Customer;
import com.clarksprojects.ecommerce.security.jwt.JwtUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
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
    void login_shouldReturnEmail() throws Exception {
        Authentication auth = mock(Authentication.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(auth);
        when(jwtUtils.generateToken("test@example.com")).thenReturn("mock-jwt-token");

        LoginRequest request = new LoginRequest("test@example.com", "password123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("test@example.com"));
    }

    @Test
    void login_shouldReturn401ForInvalidCredentials() throws Exception {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Invalid credentials"));

        LoginRequest request = new LoginRequest("bad@example.com", "wrongpassword");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void register_shouldReturnEmailForNewUser() throws Exception {
        when(customerRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(customerRepository.save(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtUtils.generateToken("new@example.com")).thenReturn("new-jwt-token");

        RegisterRequest.AddressDto shipping = new RegisterRequest.AddressDto(
                "123 Main St", "TestCity", "CA", "90210", "US");

        RegisterRequest request = new RegisterRequest(
                "new@example.com", "securePass123", "New", "User",
                shipping, null, null, null, null, null, null);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("new@example.com"));
    }

    @Test
    void register_shouldReturn400ForDuplicateEmail() throws Exception {
        when(customerRepository.existsByEmail("existing@example.com")).thenReturn(true);

        RegisterRequest request = new RegisterRequest(
                "existing@example.com", "password123", "Existing", "User",
                null, null, null, null, null, null, null);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getProfile_shouldReturn401WhenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/api/auth/profile"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void register_shouldAcceptShippingAddress() throws Exception {
        when(customerRepository.existsByEmail("withaddr@example.com")).thenReturn(false);
        when(customerRepository.save(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtUtils.generateToken("withaddr@example.com")).thenReturn("addr-jwt-token");

        RegisterRequest.AddressDto shipping = new RegisterRequest.AddressDto(
                "100 Test Blvd", "TestCity", "CA", "90210", "US");

        RegisterRequest request = new RegisterRequest(
                "withaddr@example.com", "securePass123", "With", "Address",
                shipping, null, null, null, null, null, null);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("withaddr@example.com"));
    }
}
