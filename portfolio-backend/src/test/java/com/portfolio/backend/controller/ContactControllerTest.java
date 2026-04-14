package com.portfolio.backend.controller;

import com.portfolio.backend.dto.ContactRequest;
import com.portfolio.backend.service.EmailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ContactControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private EmailService emailService;

    @Test
    void sendContactEmail_withValidRequest_returnsSuccess() throws Exception {
        doNothing().when(emailService).sendContactEmail(any(ContactRequest.class));

        ContactRequest request = new ContactRequest(
                "John Doe",
                "john@example.com",
                "Hello from the site",
                "This is a test message that is long enough."
        );

        mockMvc.perform(post("/api/contact")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Your message has been sent successfully! I'll get back to you soon."));

        verify(emailService).sendContactEmail(any(ContactRequest.class));
    }

    @Test
    void sendContactEmail_withMissingName_returnsBadRequest() throws Exception {
        ContactRequest request = new ContactRequest(
                "",
                "john@example.com",
                "Hello from the site",
                "This is a test message that is long enough."
        );

        mockMvc.perform(post("/api/contact")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void sendContactEmail_withInvalidEmail_returnsBadRequest() throws Exception {
        ContactRequest request = new ContactRequest(
                "John Doe",
                "not-an-email",
                "Hello from the site",
                "This is a test message that is long enough."
        );

        mockMvc.perform(post("/api/contact")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void sendContactEmail_withMessageTooShort_returnsBadRequest() throws Exception {
        ContactRequest request = new ContactRequest(
                "John Doe",
                "john@example.com",
                "Hello from the site",
                "Short"
        );

        mockMvc.perform(post("/api/contact")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
