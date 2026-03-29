package com.clarksprojects.ecommerce.service;

import com.clarksprojects.ecommerce.dto.Purchase;
import com.clarksprojects.ecommerce.dto.PurchaseResponse;

public interface CheckoutService {

  PurchaseResponse placeOrder(Purchase purchase, String authenticatedEmail);
}
