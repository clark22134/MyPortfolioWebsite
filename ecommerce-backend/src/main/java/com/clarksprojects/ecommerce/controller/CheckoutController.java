package com.clarksprojects.ecommerce.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.clarksprojects.ecommerce.dto.Purchase;
import com.clarksprojects.ecommerce.dto.PurchaseResponse;
import com.clarksprojects.ecommerce.service.CheckoutService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;


@RestController
@RequestMapping("/api/checkout")
public class CheckoutController {

  private CheckoutService checkoutService;

  public CheckoutController(CheckoutService checkoutService) {
    this.checkoutService = checkoutService;
  }

  @PostMapping("/purchase")
  public PurchaseResponse placeOrder(@RequestBody Purchase purchase) {
      
      return checkoutService.placeOrder(purchase);
  }
  

}
