package com.clarksprojects.ecommerce.entity;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for entity helper methods that carry non-trivial logic.
 */
class EntityTest {

    // -------------------------------------------------------------------------
    // Customer
    // -------------------------------------------------------------------------

    @Test
    void customer_maskCardNumber_retainsOnlyLastFourDigits() {
        Customer customer = new Customer();
        customer.setCardNumber("4111111111111234");

        customer.maskCardNumber();

        assertThat(customer.getCardNumber()).isEqualTo("1234");
    }

    @Test
    void customer_maskCardNumber_doesNotAlterShortNumbers() {
        Customer customer = new Customer();
        customer.setCardNumber("1234");

        customer.maskCardNumber();

        assertThat(customer.getCardNumber()).isEqualTo("1234");
    }

    @Test
    void customer_maskCardNumber_doesNothingWhenNull() {
        Customer customer = new Customer();
        customer.setCardNumber(null);

        customer.maskCardNumber(); // Should not throw

        assertThat(customer.getCardNumber()).isNull();
    }

    @Test
    void customer_addOrder_linksBidirectionally() {
        Customer customer = new Customer();
        Order order = new Order();

        customer.add(order);

        assertThat(customer.getOrders()).contains(order);
        assertThat(order.getCustomer()).isEqualTo(customer);
    }

    @Test
    void customer_addNullOrder_doesNotAddToCollection() {
        Customer customer = new Customer();

        customer.add(null);

        assertThat(customer.getOrders()).isEmpty();
    }

    // -------------------------------------------------------------------------
    // Order
    // -------------------------------------------------------------------------

    @Test
    void order_addItem_linksBidirectionally() {
        Order order = new Order();
        OrderItem item = new OrderItem();

        order.add(item);

        assertThat(order.getOrderItems()).contains(item);
        assertThat(item.getOrder()).isEqualTo(order);
    }

    @Test
    void order_addNullItem_doesNotAddToCollection() {
        Order order = new Order();

        order.add(null);

        assertThat(order.getOrderItems()).isEmpty();
    }
}
