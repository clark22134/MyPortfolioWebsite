package com.clarksprojects.ecommerce.dto;

import lombok.Data;

@Data
public class CustomerProfileResponse {

    private String firstName;
    private String lastName;
    private String email;

    private AddressDto defaultShippingAddress;
    private AddressDto defaultBillingAddress;

    private String cardType;
    private String nameOnCard;
    private String cardNumberLast4;
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
