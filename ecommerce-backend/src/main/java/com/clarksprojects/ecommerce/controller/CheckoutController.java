package com.clarksprojects.ecommerce.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RestController;

import com.clarksprojects.ecommerce.dto.Purchase;
import com.clarksprojects.ecommerce.dto.PurchaseResponse;
import com.clarksprojects.ecommerce.service.CheckoutService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.security.Principal;


@RestController
@RequestMapping("/api/checkout")
@RequiredArgsConstructor
public class CheckoutController {

  private final CheckoutService checkoutService;

  @PostMapping("/purchase")
  public PurchaseResponse placeOrder(@RequestBody Purchase purchase, Principal principal) {
      String authenticatedEmail = (principal != null) ? principal.getName() : null;
      return checkoutService.placeOrder(purchase, authenticatedEmail);
  }
  

}
