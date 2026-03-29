package com.clarksprojects.ats.service;

import com.clarksprojects.ats.dto.ParsedResume;
import com.clarksprojects.ats.exception.UnsupportedFileTypeException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.tika.Tika;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ResumeParserService {

    private static final Tika TIKA = new Tika();

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain"
    );

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "[a-zA-Z0-9_%+\\-]++(?:\\.[a-zA-Z0-9_%+\\-]++)*+@(?:[a-zA-Z0-9\\-]++\\.)++[a-zA-Z]{2,6}"
    );

    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "(?:\\+?1[.\\-\\s]?)?\\(?\\d{3}\\)?[.\\-\\s]?\\d{3}[.\\-\\s]?\\d{4}"
    );

    private static final List<String> TECH_SKILLS = List.of(
            "Agile", "Ansible", "Angular", "AWS", "Azure", "Bash", "Bootstrap",
            "C++", "C#", "CI/CD", "CSS", "Cypress",
            "Deep Learning", "Django", "Docker",
            "Elasticsearch", "Express",
            "Figma", "Flask",
            "GCP", "Git", "Go", "GraphQL", "Gradle",
            "Hadoop", "HTML",
            "Java", "JavaScript", "Jenkins", "Jira", "JUnit",
            "Kafka", "Kotlin", "Kubernetes",
            "Linux",
            "Machine Learning", "Maven", "Microservices", "Mockito", "MongoDB", "MySQL",
            "Next.js", "Node.js", "NoSQL", "npm",
            "Oracle",
            "PHP", "pip", "PostgreSQL", "PowerShell", "Python",
            "RabbitMQ", "React", "Redis", "REST", "Ruby", "Rust",
            "SASS", "Scala", "Scrum", "Selenium", "Spark", "Spring", "Spring Boot", "SQL", "Swift",
            "TailwindCSS", "Terraform", "TensorFlow", "TypeScript",
            "Vue",
            "GitHub Actions", "REST API", "gRPC", "PyTorch"
    );

    public ParsedResume parse(MultipartFile file) throws IOException {
        byte[] bytes = file.getBytes();
        String detectedMime = TIKA.detect(bytes);

        if (!ALLOWED_MIME_TYPES.contains(detectedMime)) {
            throw new UnsupportedFileTypeException(
                    "Unsupported file type. Please upload a PDF, DOCX, or plain text file.");
        }

        String text = extractText(bytes, detectedMime);
        String email = extractFirst(EMAIL_PATTERN, text);
        String phone = extractFirst(PHONE_PATTERN, text);
        String[] nameParts = extractName(text, email);
        String skills = extractSkills(text);

        return new ParsedResume(nameParts[0], nameParts[1], email, phone, skills, text);
    }

    private String extractText(byte[] bytes, String mimeType) throws IOException {
        return switch (mimeType) {
            case "application/pdf" -> extractFromPdf(bytes);
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ->
                    extractFromDocx(bytes);
            default -> new String(bytes);
        };
    }

    private String extractFromPdf(byte[] bytes) throws IOException {
        try (PDDocument doc = Loader.loadPDF(bytes)) {
            return new PDFTextStripper().getText(doc);
        }
    }

    private String extractFromDocx(byte[] bytes) throws IOException {
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes));
             XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
            return extractor.getText();
        }
    }

    private String extractFirst(Pattern pattern, String text) {
        Matcher m = pattern.matcher(text);
        return m.find() ? m.group() : null;
    }

    private String[] extractName(String text, String email) {
        String[] lines = text.split("\\r?\\n");
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isBlank() || trimmed.length() > 60) continue;
            if (trimmed.contains("@") || trimmed.matches(".*\\d{3}.*\\d{4}.*")) continue;
            String[] words = trimmed.split("\\s+");
            if (words.length == 2
                    && words[0].matches("[A-Z][a-z]+")
                    && words[1].matches("[A-Z][a-z]+")) {
                return words;
            }
        }
        if (email != null) {
            String local = email.split("@")[0].replaceAll("[^a-zA-Z.]", "");
            String[] parts = local.split("\\.");
            if (parts.length >= 2) {
                return new String[]{capitalize(parts[0]), capitalize(parts[1])};
            }
            return new String[]{capitalize(local), ""};
        }
        return new String[]{"", ""};
    }

    private String extractSkills(String text) {
        String lowerText = text.toLowerCase();
        List<String> found = new ArrayList<>();
        for (String skill : TECH_SKILLS) {
            if (lowerText.contains(skill.toLowerCase())) {
                found.add(skill);
            }
        }
        found.sort(String::compareToIgnoreCase);
        return String.join(", ", found);
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1).toLowerCase();
    }
}
