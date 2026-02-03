package com.portfolio.backend.controller;

import com.portfolio.backend.dto.ApiResponse;
import com.portfolio.backend.dto.ContactRequest;
import com.portfolio.backend.service.EmailService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for contact form submissions.
 * Handles sending contact emails from the portfolio website.
 * 
 * Note: CORS is configured globally in SecurityConfig, so @CrossOrigin is not needed here.
 */
@RestController
@RequestMapping("/api/contact")
public class ContactController {

    private final EmailService emailService;

    public ContactController(EmailService emailService) {
        this.emailService = emailService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> sendContactEmail(@Valid @RequestBody ContactRequest request) {
        emailService.sendContactEmail(request);
        return ResponseEntity.ok(ApiResponse.success(
                "Your message has been sent successfully! I'll get back to you soon."
        ));
    }
}
