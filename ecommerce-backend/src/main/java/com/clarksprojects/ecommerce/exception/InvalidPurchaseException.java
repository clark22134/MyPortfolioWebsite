package com.clarksprojects.ecommerce.exception;

/**
 * Thrown when a checkout request fails server-side validation — e.g. an empty
 * order, a non-positive quantity, or a line item referencing a product that
 * does not exist or is inactive. Maps to HTTP 400 (client error), not 500.
 */
public class InvalidPurchaseException extends RuntimeException {

    public InvalidPurchaseException(String message) {
        super(message);
    }
}
