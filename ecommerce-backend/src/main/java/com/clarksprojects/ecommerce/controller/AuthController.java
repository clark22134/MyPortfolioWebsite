package com.clarksprojects.ecommerce.controller;

import com.clarksprojects.ecommerce.dao.CustomerRepository;
import com.clarksprojects.ecommerce.dto.AuthResponse;
import com.clarksprojects.ecommerce.dto.CustomerProfileResponse;
import com.clarksprojects.ecommerce.dto.LoginRequest;
import com.clarksprojects.ecommerce.dto.RegisterRequest;
import com.clarksprojects.ecommerce.entity.Address;
import com.clarksprojects.ecommerce.entity.Customer;
import com.clarksprojects.ecommerce.security.CookieUtil;
import com.clarksprojects.ecommerce.security.jwt.JwtUtils;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final CookieUtil cookieUtil;

    @Value("${app.jwt.expiration-ms}")
    private long jwtExpirationMs;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
                                               HttpServletResponse response) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String token = jwtUtils.generateToken(request.getEmail());
        cookieUtil.addJwtCookie(response, token, (int) (jwtExpirationMs / 1000));
        return ResponseEntity.ok(new AuthResponse(request.getEmail()));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request,
                                       HttpServletResponse response) {
        if (customerRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("Email is already in use");
        }

        Customer customer = new Customer();
        customer.setEmail(request.getEmail());
        customer.setPassword(passwordEncoder.encode(request.getPassword()));
        customer.setFirstName(request.getFirstName());
        customer.setLastName(request.getLastName());

        // Default shipping address (required)
        if (request.getShippingAddress() != null) {
            customer.setDefaultShippingAddress(buildAddress(request.getShippingAddress()));
        }

        // Default billing address (optional)
        if (request.getBillingAddress() != null) {
            customer.setDefaultBillingAddress(buildAddress(request.getBillingAddress()));
        }

        // Credit card info (optional) — only store last 4 digits
        if (request.getCardNumber() != null && !request.getCardNumber().isBlank()) {
            customer.setCardType(request.getCardType());
            customer.setNameOnCard(request.getNameOnCard());
            customer.setCardNumber(request.getCardNumber());
            customer.maskCardNumber();
            customer.setCardExpirationMonth(request.getCardExpirationMonth());
            customer.setCardExpirationYear(request.getCardExpirationYear());
        }

        customerRepository.save(customer);

        String token = jwtUtils.generateToken(request.getEmail());
        cookieUtil.addJwtCookie(response, token, (int) (jwtExpirationMs / 1000));
        return ResponseEntity.ok(new AuthResponse(request.getEmail()));
    }

    @GetMapping("/profile")
    public ResponseEntity<CustomerProfileResponse> getProfile(Principal principal) {
        Customer customer = customerRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        CustomerProfileResponse profile = new CustomerProfileResponse();
        profile.setFirstName(customer.getFirstName());
        profile.setLastName(customer.getLastName());
        profile.setEmail(customer.getEmail());

        if (customer.getDefaultShippingAddress() != null) {
            profile.setDefaultShippingAddress(buildAddressDto(customer.getDefaultShippingAddress()));
        }

        if (customer.getDefaultBillingAddress() != null) {
            profile.setDefaultBillingAddress(buildAddressDto(customer.getDefaultBillingAddress()));
        }

        if (customer.getCardNumber() != null) {
            profile.setCardType(customer.getCardType());
            profile.setNameOnCard(customer.getNameOnCard());
            // cardNumber is already stored as last 4 digits only
            profile.setCardNumberLast4(customer.getCardNumber());
            profile.setCardExpirationMonth(customer.getCardExpirationMonth());
            profile.setCardExpirationYear(customer.getCardExpirationYear());
        }

        return ResponseEntity.ok(profile);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        cookieUtil.clearJwtCookie(response);
        return ResponseEntity.ok().build();
    }

    private Address buildAddress(RegisterRequest.AddressDto dto) {
        Address address = new Address();
        address.setStreet(dto.getStreet());
        address.setCity(dto.getCity());
        address.setState(dto.getState());
        address.setZipCode(dto.getZipCode());
        address.setCountry(dto.getCountry());
        return address;
    }

    private CustomerProfileResponse.AddressDto buildAddressDto(Address address) {
        CustomerProfileResponse.AddressDto dto = new CustomerProfileResponse.AddressDto();
        dto.setStreet(address.getStreet());
        dto.setCity(address.getCity());
        dto.setState(address.getState());
        dto.setZipCode(address.getZipCode());
        dto.setCountry(address.getCountry());
        return dto;
    }
}
