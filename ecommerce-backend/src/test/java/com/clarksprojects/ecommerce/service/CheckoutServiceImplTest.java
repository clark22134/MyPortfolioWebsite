package com.clarksprojects.ecommerce.service;

import com.clarksprojects.ecommerce.repository.CustomerRepository;
import com.clarksprojects.ecommerce.repository.ProductRepository;
import com.clarksprojects.ecommerce.dto.Purchase;
import com.clarksprojects.ecommerce.dto.PurchaseResponse;
import com.clarksprojects.ecommerce.entity.*;
import com.clarksprojects.ecommerce.exception.InvalidPurchaseException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CheckoutServiceImplTest {

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private CheckoutServiceImpl checkoutService;

    private Purchase purchase;
    private Customer customer;
    private Order order;

    @BeforeEach
    void setUp() {
        customer = new Customer();
        customer.setFirstName("John");
        customer.setLastName("Doe");
        customer.setEmail("john@example.com");

        order = new Order();
        order.setTotalPrice(new BigDecimal("49.99"));
        order.setTotalQuantity(2);

        OrderItem item1 = new OrderItem();
        item1.setUnitPrice(new BigDecimal("24.99"));
        item1.setQuantity(1);
        item1.setProductId(1L);

        OrderItem item2 = new OrderItem();
        item2.setUnitPrice(new BigDecimal("25.00"));
        item2.setQuantity(1);
        item2.setProductId(2L);

        Set<OrderItem> orderItems = new HashSet<>();
        orderItems.add(item1);
        orderItems.add(item2);

        Address shippingAddress = new Address();
        shippingAddress.setStreet("123 Main St");
        shippingAddress.setCity("Springfield");
        shippingAddress.setState("IL");
        shippingAddress.setCountry("US");
        shippingAddress.setZipCode("62701");

        Address billingAddress = new Address();
        billingAddress.setStreet("456 Oak Ave");
        billingAddress.setCity("Springfield");
        billingAddress.setState("IL");
        billingAddress.setCountry("US");
        billingAddress.setZipCode("62702");

        purchase = new Purchase(customer, shippingAddress, billingAddress, order, orderItems);

        // Authoritative catalog prices the service re-prices against. Lenient so the
        // negative-path tests (which build their own minimal purchases) don't trip
        // Mockito's strict unused-stub check.
        lenient().when(productRepository.findById(1L))
                .thenReturn(Optional.of(activeProduct(1L, "24.99")));
        lenient().when(productRepository.findById(2L))
                .thenReturn(Optional.of(activeProduct(2L, "25.00")));
    }

    private Product activeProduct(Long id, String unitPrice) {
        Product product = new Product();
        product.setId(id);
        product.setUnitPrice(new BigDecimal(unitPrice));
        product.setActive(true);
        return product;
    }

    @Test
    void placeOrder_shouldReturnTrackingNumber() {
        when(customerRepository.findByEmail("john@example.com")).thenReturn(Optional.empty());
        when(customerRepository.save(any(Customer.class))).thenReturn(customer);

        PurchaseResponse response = checkoutService.placeOrder(purchase, null);

        assertNotNull(response);
        assertNotNull(response.orderTrackingNumber());
        assertFalse(response.orderTrackingNumber().isEmpty());
    }

    @Test
    void placeOrder_shouldGenerateUUIDTrackingNumber() {
        when(customerRepository.findByEmail("john@example.com")).thenReturn(Optional.empty());
        when(customerRepository.save(any(Customer.class))).thenReturn(customer);

        PurchaseResponse response = checkoutService.placeOrder(purchase, null);

        String uuid = response.orderTrackingNumber();
        assertEquals(36, uuid.length());
        assertEquals(5, uuid.split("-").length);
    }

    @Test
    void placeOrder_shouldSaveCustomer() {
        when(customerRepository.findByEmail("john@example.com")).thenReturn(Optional.empty());
        when(customerRepository.save(any(Customer.class))).thenReturn(customer);

        checkoutService.placeOrder(purchase, null);

        ArgumentCaptor<Customer> captor = ArgumentCaptor.forClass(Customer.class);
        verify(customerRepository).save(captor.capture());
        assertEquals("john@example.com", captor.getValue().getEmail());
    }

    @Test
    void placeOrder_shouldReuseExistingCustomer() {
        Customer existing = new Customer();
        existing.setId(99L);
        existing.setEmail("john@example.com");
        when(customerRepository.findByEmail("john@example.com")).thenReturn(Optional.of(existing));
        when(customerRepository.save(any(Customer.class))).thenReturn(existing);

        checkoutService.placeOrder(purchase, null);

        ArgumentCaptor<Customer> captor = ArgumentCaptor.forClass(Customer.class);
        verify(customerRepository).save(captor.capture());
        assertEquals(99L, captor.getValue().getId());
    }

    @Test
    void placeOrder_shouldSetAddressesOnOrder() {
        when(customerRepository.findByEmail("john@example.com")).thenReturn(Optional.empty());
        when(customerRepository.save(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));

        checkoutService.placeOrder(purchase, null);

        assertEquals("123 Main St", order.getShippingAddress().getStreet());
        assertEquals("456 Oak Ave", order.getBillingAddress().getStreet());
    }

    @Test
    void placeOrder_shouldAddOrderItemsToOrder() {
        when(customerRepository.findByEmail("john@example.com")).thenReturn(Optional.empty());
        when(customerRepository.save(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));

        checkoutService.placeOrder(purchase, null);

        assertEquals(2, order.getOrderItems().size());
        order.getOrderItems().forEach(item -> assertEquals(order, item.getOrder()));
    }

    @Test
    void placeOrder_shouldUseAuthenticatedEmailOverFormEmail() {
        Customer authCustomer = new Customer();
        authCustomer.setId(42L);
        authCustomer.setEmail("auth@example.com");
        when(customerRepository.findByEmail("auth@example.com")).thenReturn(Optional.of(authCustomer));
        when(customerRepository.save(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));

        checkoutService.placeOrder(purchase, "auth@example.com");

        ArgumentCaptor<Customer> captor = ArgumentCaptor.forClass(Customer.class);
        verify(customerRepository).save(captor.capture());
        assertEquals(42L, captor.getValue().getId());
        verify(customerRepository).findByEmail("auth@example.com");
    }

    @Test
    void placeOrder_shouldSetStatusToProcessing() {
        when(customerRepository.findByEmail("john@example.com")).thenReturn(Optional.empty());
        when(customerRepository.save(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));

        checkoutService.placeOrder(purchase, null);

        assertEquals(OrderStatus.PROCESSING, order.getStatus());
    }

    @Test
    void placeOrder_shouldRepriceFromCatalogAndIgnoreClientSuppliedPrices() {
        // Tamper every client-supplied price/total to near-zero.
        order.setTotalPrice(new BigDecimal("0.01"));
        order.setTotalQuantity(99);
        purchase.orderItems().forEach(i -> i.setUnitPrice(new BigDecimal("0.01")));

        when(customerRepository.findByEmail("john@example.com")).thenReturn(Optional.empty());
        when(customerRepository.save(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));

        checkoutService.placeOrder(purchase, null);

        // Server recomputes from the catalog: 24.99 + 25.00 = 49.99, qty 2.
        assertEquals(0, new BigDecimal("49.99").compareTo(order.getTotalPrice()));
        assertEquals(2, order.getTotalQuantity());
        order.getOrderItems().forEach(item -> {
            BigDecimal expected = item.getProductId() == 1L
                    ? new BigDecimal("24.99") : new BigDecimal("25.00");
            assertEquals(0, expected.compareTo(item.getUnitPrice()));
        });
    }

    @Test
    void placeOrder_shouldRejectEmptyOrder() {
        Purchase empty = new Purchase(customer, new Address(), new Address(), new Order(), new HashSet<>());

        assertThrows(InvalidPurchaseException.class, () -> checkoutService.placeOrder(empty, null));
        verify(customerRepository, never()).save(any());
    }

    @Test
    void placeOrder_shouldRejectUnknownProduct() {
        OrderItem item = new OrderItem();
        item.setQuantity(1);
        item.setProductId(999L); // not stubbed -> Optional.empty()
        Set<OrderItem> items = new HashSet<>();
        items.add(item);
        Purchase bad = new Purchase(customer, new Address(), new Address(), new Order(), items);

        assertThrows(InvalidPurchaseException.class, () -> checkoutService.placeOrder(bad, null));
        verify(customerRepository, never()).save(any());
    }

    @Test
    void placeOrder_shouldRejectInactiveProduct() {
        Product inactive = activeProduct(3L, "10.00");
        inactive.setActive(false);
        when(productRepository.findById(3L)).thenReturn(Optional.of(inactive));

        OrderItem item = new OrderItem();
        item.setQuantity(1);
        item.setProductId(3L);
        Set<OrderItem> items = new HashSet<>();
        items.add(item);
        Purchase bad = new Purchase(customer, new Address(), new Address(), new Order(), items);

        assertThrows(InvalidPurchaseException.class, () -> checkoutService.placeOrder(bad, null));
        verify(customerRepository, never()).save(any());
    }

    @Test
    void placeOrder_shouldRejectNonPositiveQuantity() {
        OrderItem item = new OrderItem();
        item.setQuantity(0);
        item.setProductId(1L);
        Set<OrderItem> items = new HashSet<>();
        items.add(item);
        Purchase bad = new Purchase(customer, new Address(), new Address(), new Order(), items);

        assertThrows(InvalidPurchaseException.class, () -> checkoutService.placeOrder(bad, null));
        verify(customerRepository, never()).save(any());
    }
}
