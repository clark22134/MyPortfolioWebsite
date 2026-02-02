package com.portfolio.backend.service;

import com.portfolio.backend.dto.ContactRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    
    @Autowired
    private JavaMailSender mailSender;
    
    @Value("${contact.email.to}")
    private String contactEmail;
    
    @Value("${contact.email.from:noreply@clarkfoster.com}")
    private String fromEmail;
    
    public void sendContactEmail(ContactRequest request) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(contactEmail);
            message.setSubject("Portfolio Contact: " + request.getSubject());
            message.setText(buildEmailBody(request));
            message.setReplyTo(request.getEmail());
            
            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
        }
    }
    
    private String buildEmailBody(ContactRequest request) {
        return String.format(
            "New contact form submission:\n\n" +
            "Name: %s\n" +
            "Email: %s\n" +
            "Subject: %s\n\n" +
            "Message:\n%s",
            request.getName(),
            request.getEmail(),
            request.getSubject(),
            request.getMessage()
        );
    }
}
