package com.clarksprojects.ecommerce.service;

import com.clarksprojects.ecommerce.dto.CartItemDto;
import com.clarksprojects.ecommerce.entity.CartItem;
import com.clarksprojects.ecommerce.entity.Customer;
import com.clarksprojects.ecommerce.entity.Product;
import com.clarksprojects.ecommerce.repository.CartItemRepository;
import com.clarksprojects.ecommerce.repository.CustomerRepository;
import com.clarksprojects.ecommerce.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CartServiceImplTest {

    @Mock
    private CartItemRepository cartItemRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private CartServiceImpl cartService;

    private Customer customer;
    private Product product1;
    private Product product2;

    @BeforeEach
    void setUp() {
        customer = new Customer();
        customer.setId(1L);
        customer.setEmail("user@example.com");

        product1 = new Product();
        product1.setId(10L);
        product1.setName("Widget A");
        product1.setUnitPrice(new BigDecimal("9.99"));
        product1.setImageUrl("/images/widget-a.jpg");

        product2 = new Product();
        product2.setId(20L);
        product2.setName("Gadget B");
        product2.setUnitPrice(new BigDecimal("24.99"));
        product2.setImageUrl("/images/gadget-b.jpg");
    }

    // ── getCart ──────────────────────────────────────────────────────────────

    @Test
    void getCart_existingCustomer_returnsCartItems() {
        CartItem item = new CartItem();
        item.setProduct(product1);
        item.setQuantity(2);

        when(customerRepository.findByEmail("user@example.com")).thenReturn(Optional.of(customer));
        when(cartItemRepository.findByCustomerId(1L)).thenReturn(List.of(item));

        List<CartItemDto> result = cartService.getCart("user@example.com");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).productId()).isEqualTo(10L);
        assertThat(result.get(0).name()).isEqualTo("Widget A");
        assertThat(result.get(0).unitPrice()).isEqualByComparingTo("9.99");
        assertThat(result.get(0).quantity()).isEqualTo(2);
        assertThat(result.get(0).imageUrl()).isEqualTo("/images/widget-a.jpg");
    }

    @Test
    void getCart_emptyCart_returnsEmptyList() {
        when(customerRepository.findByEmail("user@example.com")).thenReturn(Optional.of(customer));
        when(cartItemRepository.findByCustomerId(1L)).thenReturn(List.of());

        List<CartItemDto> result = cartService.getCart("user@example.com");

        assertThat(result).isEmpty();
    }

    @Test
    void getCart_unknownCustomer_throwsRuntimeException() {
        when(customerRepository.findByEmail("ghost@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cartService.getCart("ghost@example.com"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Customer not found");
    }

    // ── saveCart ─────────────────────────────────────────────────────────────

    @Test
    void saveCart_newItems_deletesOldAndSavesNew() {
        CartItemDto dto1 = new CartItemDto(10L, "Widget A", new BigDecimal("9.99"), 3, "/images/widget-a.jpg");
        CartItemDto dto2 = new CartItemDto(20L, "Gadget B", new BigDecimal("24.99"), 1, "/images/gadget-b.jpg");

        when(customerRepository.findByEmail("user@example.com")).thenReturn(Optional.of(customer));
        when(productRepository.findAllById(anyList())).thenReturn(List.of(product1, product2));
        when(cartItemRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        List<CartItemDto> result = cartService.saveCart("user@example.com", List.of(dto1, dto2));

        verify(cartItemRepository).deleteByCustomerId(1L);
        verify(cartItemRepository).flush();

        ArgumentCaptor<List<CartItem>> captor = ArgumentCaptor.forClass(List.class);
        verify(cartItemRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(2);

        assertThat(result).hasSize(2);
    }

    @Test
    void saveCart_emptyItems_deletesOldAndReturnsEmpty() {
        when(customerRepository.findByEmail("user@example.com")).thenReturn(Optional.of(customer));

        List<CartItemDto> result = cartService.saveCart("user@example.com", List.of());

        verify(cartItemRepository).deleteByCustomerId(1L);
        verify(cartItemRepository).flush();
        verify(cartItemRepository, never()).saveAll(anyList());
        assertThat(result).isEmpty();
    }

    @Test
    void saveCart_nullItems_deletesOldAndReturnsEmpty() {
        when(customerRepository.findByEmail("user@example.com")).thenReturn(Optional.of(customer));

        List<CartItemDto> result = cartService.saveCart("user@example.com", null);

        verify(cartItemRepository).deleteByCustomerId(1L);
        verify(cartItemRepository).flush();
        assertThat(result).isEmpty();
    }

    @Test
    void saveCart_unknownCustomer_throwsRuntimeException() {
        when(customerRepository.findByEmail("ghost@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cartService.saveCart("ghost@example.com", List.of()))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Customer not found");
    }

    @Test
    void saveCart_itemReferencingDeletedProduct_isSkipped() {
        // product 99 no longer exists in the database
        CartItemDto orphaned = new CartItemDto(99L, "Gone", BigDecimal.ONE, 1, null);
        CartItemDto valid = new CartItemDto(10L, "Widget A", new BigDecimal("9.99"), 2, null);

        when(customerRepository.findByEmail("user@example.com")).thenReturn(Optional.of(customer));
        // productRepository only returns product1 — product 99 is missing
        when(productRepository.findAllById(anyList())).thenReturn(List.of(product1));
        when(cartItemRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        List<CartItemDto> result = cartService.saveCart("user@example.com", List.of(orphaned, valid));

        // Only the valid item should end up in the saved cart
        ArgumentCaptor<List<CartItem>> captor = ArgumentCaptor.forClass(List.class);
        verify(cartItemRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(1);
        assertThat(captor.getValue().get(0).getProduct().getId()).isEqualTo(10L);
        assertThat(result).hasSize(1);
    }

    @Test
    void saveCart_setsCorrectQuantityOnSavedItem() {
        CartItemDto dto = new CartItemDto(10L, "Widget A", new BigDecimal("9.99"), 5, null);

        when(customerRepository.findByEmail("user@example.com")).thenReturn(Optional.of(customer));
        when(productRepository.findAllById(anyList())).thenReturn(List.of(product1));
        when(cartItemRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        cartService.saveCart("user@example.com", List.of(dto));

        ArgumentCaptor<List<CartItem>> captor = ArgumentCaptor.forClass(List.class);
        verify(cartItemRepository).saveAll(captor.capture());
        assertThat(captor.getValue().get(0).getQuantity()).isEqualTo(5);
        assertThat(captor.getValue().get(0).getCustomer()).isSameAs(customer);
    }
}
