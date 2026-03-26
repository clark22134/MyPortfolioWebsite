package com.clarksprojects.ecommerce.security;

import com.clarksprojects.ecommerce.dao.CustomerRepository;
import com.clarksprojects.ecommerce.entity.Customer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserDetailsServiceImplTest {

    @Mock
    private CustomerRepository customerRepository;

    @InjectMocks
    private UserDetailsServiceImpl userDetailsService;

    @Test
    void loadUserByUsername_shouldReturnUserDetails() {
        Customer customer = new Customer();
        customer.setEmail("found@example.com");
        customer.setPassword("encodedPassword");

        when(customerRepository.findByEmail("found@example.com"))
                .thenReturn(Optional.of(customer));

        UserDetails result = userDetailsService.loadUserByUsername("found@example.com");

        assertEquals("found@example.com", result.getUsername());
        assertEquals("encodedPassword", result.getPassword());
        assertTrue(result.getAuthorities().isEmpty());
    }

    @Test
    void loadUserByUsername_shouldThrowWhenNotFound() {
        when(customerRepository.findByEmail("missing@example.com"))
                .thenReturn(Optional.empty());

        assertThrows(UsernameNotFoundException.class, () ->
                userDetailsService.loadUserByUsername("missing@example.com"));
    }
}
