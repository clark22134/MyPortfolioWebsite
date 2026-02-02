package com.portfolio.backend.controller;

import com.portfolio.backend.dto.ContactRequest;
import com.portfolio.backend.service.EmailService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/contact")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost", "https://clarkfoster.com"})
public class ContactController {
    
    @Autowired
    private EmailService emailService;
    
    @PostMapping
    public ResponseEntity<Map<String, String>> sendContactEmail(@Valid @RequestBody ContactRequest request) {
        try {
            emailService.sendContactEmail(request);
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Your message has been sent successfully! I'll get back to you soon.");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to send message. Please try again later or email directly at clark@clarkfoster.com");
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}
