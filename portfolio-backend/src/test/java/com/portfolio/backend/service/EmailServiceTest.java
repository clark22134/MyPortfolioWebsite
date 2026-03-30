package com.portfolio.backend.service;

import com.portfolio.backend.dto.ContactRequest;
import com.portfolio.backend.exception.EmailSendException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    private EmailService emailService;

    @BeforeEach
    void setUp() {
        emailService = new EmailService(mailSender, "contact@clarkfoster.com", "noreply@clarkfoster.com");
    }

    @Test
    void sendContactEmail_sendsCorrectMessage() {
        ContactRequest request = new ContactRequest(
                "John Doe",
                "john@example.com",
                "Inquiry",
                "I'd like to discuss a project opportunity."
        );

        doNothing().when(mailSender).send(any(SimpleMailMessage.class));

        emailService.sendContactEmail(request);

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());

        SimpleMailMessage sent = captor.getValue();
        assertThat(sent.getFrom()).isEqualTo("noreply@clarkfoster.com");
        assertThat(sent.getTo()).contains("contact@clarkfoster.com");
        assertThat(sent.getSubject()).isEqualTo("Portfolio Contact: Inquiry");
        assertThat(sent.getReplyTo()).isEqualTo("john@example.com");
        assertThat(sent.getText()).contains("John Doe");
        assertThat(sent.getText()).contains("john@example.com");
        assertThat(sent.getText()).contains("I'd like to discuss a project opportunity.");
    }

    @Test
    void sendContactEmail_throwsEmailSendException_onMailFailure() {
        ContactRequest request = new ContactRequest(
                "Jane Smith",
                "jane@example.com",
                "Help",
                "This is a message about a collaboration."
        );

        doThrow(new RuntimeException("SMTP connection failed"))
                .when(mailSender).send(any(SimpleMailMessage.class));

        assertThatThrownBy(() -> emailService.sendContactEmail(request))
                .isInstanceOf(EmailSendException.class)
                .hasMessageContaining("Failed to send email");
    }
}
