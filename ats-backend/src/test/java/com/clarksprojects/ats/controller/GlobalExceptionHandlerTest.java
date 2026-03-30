package com.clarksprojects.ats.controller;

import com.clarksprojects.ats.exception.ResourceNotFoundException;
import com.clarksprojects.ats.exception.UnsupportedFileTypeException;
import org.junit.jupiter.api.Test;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.io.IOException;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleNotFound_returnsErrorMessage() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Job not found with id 999");

        Map<String, String> result = handler.handleNotFound(ex);

        assertThat(result).containsEntry("error", "Job not found with id 999");
    }

    @Test
    void handleUnsupportedFileType_returnsErrorMessage() {
        UnsupportedFileTypeException ex = new UnsupportedFileTypeException("Unsupported file type: .exe");

        Map<String, String> result = handler.handleUnsupportedFileType(ex);

        assertThat(result).containsEntry("error", "Unsupported file type: .exe");
    }

    @Test
    void handleValidation_returnsFieldErrors() {
        Object target = new Object();
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(target, "jobRequest");
        bindingResult.addError(new FieldError("jobRequest", "title", "Title is required"));
        bindingResult.addError(new FieldError("jobRequest", "employer", "Employer is required"));

        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(null, bindingResult);

        Map<String, String> result = handler.handleValidation(ex);

        assertThat(result).containsEntry("title", "Title is required");
        assertThat(result).containsEntry("employer", "Employer is required");
    }

    @Test
    void handleMaxUploadSize_returnsErrorMessage() {
        MaxUploadSizeExceededException ex = new MaxUploadSizeExceededException(10_000_000L);

        Map<String, String> result = handler.handleMaxUploadSize(ex);

        assertThat(result).containsEntry("error", "File is too large. Maximum upload size is 10 MB.");
    }

    @Test
    void handleIOException_returnsErrorMessage() {
        IOException ex = new IOException("Disk full");

        Map<String, String> result = handler.handleIOException(ex);

        assertThat(result).containsEntry("error", "Failed to process the uploaded file. Please try again.");
    }
}
