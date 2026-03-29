package com.clarksprojects.ecommerce.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    @NotBlank
    @Size(min = 8, max = 128)
    private String password;

    @NotBlank
    @Size(max = 100)
    private String firstName;

    @NotBlank
    @Size(max = 100)
    private String lastName;

    // Default shipping address (required)
    @NotNull
    @Valid
    private AddressDto shippingAddress;

    // Default billing address (optional)
    @Valid
    private AddressDto billingAddress;

    // Credit card info (optional)
    @Size(max = 50)
    private String cardType;

    @Size(max = 100)
    private String nameOnCard;

    @Pattern(regexp = "^$|^[0-9]{13,19}$", message = "Card number must be 13-19 digits")
    private String cardNumber;

    private Integer cardExpirationMonth;
    private Integer cardExpirationYear;

    @Data
    public static class AddressDto {
        @NotBlank
        @Size(max = 255)
        private String street;

        @NotBlank
        @Size(max = 100)
        private String city;

        @NotBlank
        @Size(max = 100)
        private String state;

        @NotBlank
        @Size(max = 20)
        private String zipCode;

        @NotBlank
        @Size(max = 100)
        private String country;
    }
}
