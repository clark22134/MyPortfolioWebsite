package com.clarksprojects.ecommerce.dto;

import lombok.Data;

@Data // creates constructor, getters, setters, toString, equals and hashCode methods so we dont have to write them ourselves
public class PurchaseResponse {

  private final String orderTrackingNumber;

}
