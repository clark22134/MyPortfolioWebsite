package com.portfolio.backend.service;

import com.portfolio.backend.dto.ContactRequest;
import com.portfolio.backend.exception.EmailSendException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Service for sending emails.
 * Handles contact form submissions from the portfolio website.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String EMAIL_SUBJECT_PREFIX = "Portfolio Contact: ";

    private final JavaMailSender mailSender;
    private final String contactEmail;
    private final String fromEmail;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${contact.email.to}") String contactEmail,
            @Value("${contact.email.from:noreply@clarkfoster.com}") String fromEmail) {
        this.mailSender = mailSender;
        this.contactEmail = contactEmail;
        this.fromEmail = fromEmail;
    }

    /**
     * Send a contact form email.
     *
     * @param request The contact form data
     * @throws EmailSendException if email sending fails
     */
    public void sendContactEmail(ContactRequest request) {
        try {
            SimpleMailMessage message = createContactMessage(request);
            mailSender.send(message);
            log.info("Contact email sent successfully from: {}", request.email());
        } catch (Exception e) {
            log.error("Failed to send contact email from: {}", request.email(), e);
            throw new EmailSendException("Failed to send email", e);
        }
    }

    private SimpleMailMessage createContactMessage(ContactRequest request) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(contactEmail);
        message.setSubject(EMAIL_SUBJECT_PREFIX + request.subject());
        message.setText(buildEmailBody(request));
        message.setReplyTo(request.email());
        return message;
    }

    private String buildEmailBody(ContactRequest request) {
        return String.format(
                """
                New contact form submission:
                
                Name: %s
                Email: %s
                Subject: %s
                
                Message:
                %s""",
                request.name(),
                request.email(),
                request.subject(),
                request.message()
        );
    }
}
