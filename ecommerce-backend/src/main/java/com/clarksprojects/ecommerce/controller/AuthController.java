package com.clarksprojects.ecommerce.controller;

import com.clarksprojects.ecommerce.dao.CustomerRepository;
import com.clarksprojects.ecommerce.dto.AuthResponse;
import com.clarksprojects.ecommerce.dto.CustomerProfileResponse;
import com.clarksprojects.ecommerce.dto.LoginRequest;
import com.clarksprojects.ecommerce.dto.RegisterRequest;
import com.clarksprojects.ecommerce.entity.Address;
import com.clarksprojects.ecommerce.entity.Customer;
import com.clarksprojects.ecommerce.security.jwt.JwtUtils;
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
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    public AuthController(AuthenticationManager authenticationManager,
                          CustomerRepository customerRepository,
                          PasswordEncoder passwordEncoder,
                          JwtUtils jwtUtils) {
        this.authenticationManager = authenticationManager;
        this.customerRepository = customerRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String token = jwtUtils.generateToken(request.getEmail());
        return ResponseEntity.ok(new AuthResponse(token, request.getEmail()));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
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
            Address shipping = new Address();
            shipping.setStreet(request.getShippingAddress().getStreet());
            shipping.setCity(request.getShippingAddress().getCity());
            shipping.setState(request.getShippingAddress().getState());
            shipping.setZipCode(request.getShippingAddress().getZipCode());
            shipping.setCountry(request.getShippingAddress().getCountry());
            customer.setDefaultShippingAddress(shipping);
        }

        // Default billing address (optional)
        if (request.getBillingAddress() != null) {
            Address billing = new Address();
            billing.setStreet(request.getBillingAddress().getStreet());
            billing.setCity(request.getBillingAddress().getCity());
            billing.setState(request.getBillingAddress().getState());
            billing.setZipCode(request.getBillingAddress().getZipCode());
            billing.setCountry(request.getBillingAddress().getCountry());
            customer.setDefaultBillingAddress(billing);
        }

        // Credit card info (optional)
        if (request.getCardNumber() != null && !request.getCardNumber().isBlank()) {
            customer.setCardType(request.getCardType());
            customer.setNameOnCard(request.getNameOnCard());
            customer.setCardNumber(request.getCardNumber());
            customer.setCardExpirationMonth(request.getCardExpirationMonth());
            customer.setCardExpirationYear(request.getCardExpirationYear());
        }

        customerRepository.save(customer);

        String token = jwtUtils.generateToken(request.getEmail());
        return ResponseEntity.ok(new AuthResponse(token, request.getEmail()));
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
            CustomerProfileResponse.AddressDto shipping = new CustomerProfileResponse.AddressDto();
            shipping.setStreet(customer.getDefaultShippingAddress().getStreet());
            shipping.setCity(customer.getDefaultShippingAddress().getCity());
            shipping.setState(customer.getDefaultShippingAddress().getState());
            shipping.setZipCode(customer.getDefaultShippingAddress().getZipCode());
            shipping.setCountry(customer.getDefaultShippingAddress().getCountry());
            profile.setDefaultShippingAddress(shipping);
        }

        if (customer.getDefaultBillingAddress() != null) {
            CustomerProfileResponse.AddressDto billing = new CustomerProfileResponse.AddressDto();
            billing.setStreet(customer.getDefaultBillingAddress().getStreet());
            billing.setCity(customer.getDefaultBillingAddress().getCity());
            billing.setState(customer.getDefaultBillingAddress().getState());
            billing.setZipCode(customer.getDefaultBillingAddress().getZipCode());
            billing.setCountry(customer.getDefaultBillingAddress().getCountry());
            profile.setDefaultBillingAddress(billing);
        }

        if (customer.getCardNumber() != null) {
            profile.setCardType(customer.getCardType());
            profile.setNameOnCard(customer.getNameOnCard());
            String num = customer.getCardNumber();
            profile.setCardNumberLast4(num.length() >= 4 ? num.substring(num.length() - 4) : num);
            profile.setCardExpirationMonth(customer.getCardExpirationMonth());
            profile.setCardExpirationYear(customer.getCardExpirationYear());
        }

        return ResponseEntity.ok(profile);
    }
}
