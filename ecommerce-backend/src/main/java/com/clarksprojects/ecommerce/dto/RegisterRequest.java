package com.clarksprojects.ecommerce.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record RegisterRequest(
    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    String email,

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters")
    String password,

    @NotBlank(message = "First name is required")
    @Size(max = 100, message = "First name must not exceed 100 characters")
    String firstName,

    @NotBlank(message = "Last name is required")
    @Size(max = 100, message = "Last name must not exceed 100 characters")
    String lastName,

    @NotNull(message = "Shipping address is required")
    @Valid
    AddressDto shippingAddress,

    @Valid
    AddressDto billingAddress,

    @Size(max = 50, message = "Card type must not exceed 50 characters")
    String cardType,

    @Size(max = 100, message = "Name on card must not exceed 100 characters")
    String nameOnCard,

    @Pattern(regexp = "^$|^[0-9]{13,19}$", message = "Card number must be 13-19 digits")
    String cardNumber,

    Integer cardExpirationMonth,
    Integer cardExpirationYear
) {
    public record AddressDto(
        @NotBlank(message = "Street is required")
        @Size(max = 255, message = "Street must not exceed 255 characters")
        String street,

        @NotBlank(message = "City is required")
        @Size(max = 100, message = "City must not exceed 100 characters")
        String city,

        @NotBlank(message = "State is required")
        @Size(max = 100, message = "State must not exceed 100 characters")
        String state,

        @NotBlank(message = "Zip code is required")
        @Size(max = 20, message = "Zip code must not exceed 20 characters")
        String zipCode,

        @NotBlank(message = "Country is required")
        @Size(max = 100, message = "Country must not exceed 100 characters")
        String country
    ) {}
}
