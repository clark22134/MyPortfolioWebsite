package com.clarksprojects.ecommerce.dto;

import lombok.Data;

@Data
public class RegisterRequest {

    private String email;
    private String password;
    private String firstName;
    private String lastName;

    // Default shipping address (required)
    private AddressDto shippingAddress;

    // Default billing address (optional)
    private AddressDto billingAddress;

    // Credit card info (optional)
    private String cardType;
    private String nameOnCard;
    private String cardNumber;
    private Integer cardExpirationMonth;
    private Integer cardExpirationYear;

    @Data
    public static class AddressDto {
        private String street;
        private String city;
        private String state;
        private String zipCode;
        private String country;
    }
}
