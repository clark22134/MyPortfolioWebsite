package com.clarksprojects.ats.controller;

import com.clarksprojects.ats.dto.CandidateResponse;
import com.clarksprojects.ats.dto.ParsedResume;
import com.clarksprojects.ats.service.CandidateService;
import com.clarksprojects.ats.service.ResumeParserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/talent-pool")
@RequiredArgsConstructor
public class TalentPoolController {

    private static final Pattern SAFE_FILENAME = Pattern.compile(
            "^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}\\.[a-zA-Z0-9]{1,10}$"
    );

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".pdf", ".doc", ".docx", ".txt", ".rtf"
    );

    private final CandidateService candidateService;
    private final ResumeParserService resumeParserService;

    @Value("${app.upload.resume-dir}")
    private String uploadDir;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public CandidateResponse uploadResume(@RequestPart("file") MultipartFile file) throws IOException {
        ParsedResume parsed = resumeParserService.parse(file);

        String storedFilename = storeFile(file);
        String resumeUrl = "/api/talent-pool/resumes/" + storedFilename;

        return candidateService.createFromParsedResume(parsed, resumeUrl);
    }

    @GetMapping("/resumes/{filename}")
    public ResponseEntity<Resource> serveResume(@PathVariable String filename) throws MalformedURLException {
        if (!SAFE_FILENAME.matcher(filename).matches()) {
            return ResponseEntity.badRequest().build();
        }

        Path filePath = Paths.get(uploadDir).resolve(filename).normalize();
        Resource resource = new UrlResource(filePath.toUri());

        if (!resource.exists() || !resource.isReadable()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(resource);
    }

    private String storeFile(MultipartFile file) throws IOException {
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String originalName = file.getOriginalFilename();
        String extension = (originalName != null && originalName.contains("."))
                ? originalName.substring(originalName.lastIndexOf('.')).toLowerCase()
                : "";

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Unsupported file extension: " + extension);
        }

        String storedFilename = UUID.randomUUID() + extension;
        Path resolvedPath = uploadPath.resolve(storedFilename).normalize();

        if (!resolvedPath.startsWith(uploadPath)) {
            throw new IOException("Invalid file path");
        }

        Files.write(resolvedPath, file.getBytes());
        return storedFilename;
    }
}
