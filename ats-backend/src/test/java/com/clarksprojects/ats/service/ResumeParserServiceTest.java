package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.ParsedResume;
import com.clarksprojects.ats.exception.UnsupportedFileTypeException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ResumeParserServiceTest {

    private final ResumeParserService service = new ResumeParserService();

    @Test
    void parse_rejectsUnsupportedFileType() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.exe", "application/octet-stream",
                new byte[]{0x4D, 0x5A, 0x00, 0x00});

        assertThatThrownBy(() -> service.parse(file))
                .isInstanceOf(UnsupportedFileTypeException.class)
                .hasMessageContaining("Unsupported file type");
    }

    @Test
    void parse_extractsEmailAndSkillsFromPlainText() throws Exception {
        String content = """
                Jane Doe
                jane.doe@example.com
                555-123-4567
                Skills: Java, Spring Boot, Docker, PostgreSQL, AWS
                """;
        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.txt", "text/plain", content.getBytes());

        ParsedResume result = service.parse(file);

        assertThat(result.email()).isEqualTo("jane.doe@example.com");
        assertThat(result.phone()).isEqualTo("555-123-4567");
        assertThat(result.skills()).contains("Java");
        assertThat(result.skills()).contains("Spring Boot");
        assertThat(result.skills()).contains("Docker");
        assertThat(result.skills()).contains("PostgreSQL");
        assertThat(result.skills()).contains("AWS");
    }

    @Test
    void parse_extractsNameFromFirstLine() throws Exception {
        String content = "Alice Smith\nalice.smith@example.com\nJava, Python\n";
        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.txt", "text/plain", content.getBytes());

        ParsedResume result = service.parse(file);

        assertThat(result.firstName()).isEqualTo("Alice");
        assertThat(result.lastName()).isEqualTo("Smith");
    }

    @Test
    void parse_fallsBackToEmailForName() throws Exception {
        String content = "john.doe@example.com\nJava, AWS\n";
        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.txt", "text/plain", content.getBytes());

        ParsedResume result = service.parse(file);

        assertThat(result.firstName()).isEqualTo("John");
        assertThat(result.lastName()).isEqualTo("Doe");
    }

    @Test
    void parse_handlesNoMatchGracefully() throws Exception {
        String content = "No personal info here.\n";
        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.txt", "text/plain", content.getBytes());

        ParsedResume result = service.parse(file);

        assertThat(result.email()).isNull();
        assertThat(result.phone()).isNull();
        assertThat(result.firstName()).isEmpty();
        assertThat(result.lastName()).isEmpty();
    }
}
