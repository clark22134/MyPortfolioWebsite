package com.clarksprojects.ats.controller;

import com.clarksprojects.ats.config.SecurityConfig;
import com.clarksprojects.ats.dto.CandidateResponse;
import com.clarksprojects.ats.dto.ParsedResume;
import com.clarksprojects.ats.entity.PipelineStage;
import com.clarksprojects.ats.exception.UnsupportedFileTypeException;
import com.clarksprojects.ats.service.CandidateService;
import com.clarksprojects.ats.service.ResumeParserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TalentPoolController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = "app.upload.resume-dir=${java.io.tmpdir}/ats-test-uploads")
class TalentPoolControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CandidateService candidateService;

    @MockitoBean
    private ResumeParserService resumeParserService;

    @Test
    void upload_returnsCreatedCandidateFromParsedResume() throws Exception {
        ParsedResume parsed = new ParsedResume("Jane", "Doe", "jane@example.com", "555-0100", "Java, Docker", "raw text");
        CandidateResponse response = CandidateResponse.builder()
                .id(99L)
                .firstName("Jane")
                .lastName("Doe")
                .email("jane@example.com")
                .phone("555-0100")
                .skills("Java, Docker")
                .stage(PipelineStage.APPLIED)
                .stageOrder(0)
                .jobId(7L)
                .jobTitle("Talent Pool")
                .talentPool(true)
                .appliedAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        when(resumeParserService.parse(any())).thenReturn(parsed);
        when(candidateService.createFromParsedResume(any(ParsedResume.class), anyString())).thenReturn(response);

        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.txt", "text/plain", "Jane Doe\njane@example.com\nJava, Docker".getBytes());

        mockMvc.perform(multipart("/api/talent-pool/upload").file(file))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.firstName").value("Jane"))
                .andExpect(jsonPath("$.lastName").value("Doe"))
                .andExpect(jsonPath("$.talentPool").value(true))
                .andExpect(jsonPath("$.jobTitle").value("Talent Pool"));
    }

    @Test
    void upload_returns400ForUnsupportedFileType() throws Exception {
        when(resumeParserService.parse(any()))
                .thenThrow(new UnsupportedFileTypeException("Unsupported file type. Please upload a PDF, DOCX, or plain text file."));

        MockMultipartFile file = new MockMultipartFile(
                "file", "malware.exe", "application/octet-stream", new byte[]{0x4D, 0x5A});

        mockMvc.perform(multipart("/api/talent-pool/upload").file(file))
                .andExpect(status().isBadRequest());
    }

    @Test
    void serveResume_returns400ForNonUuidFilename() throws Exception {
        mockMvc.perform(get("/api/talent-pool/resumes/not-a-valid-uuid.txt"))
                .andExpect(status().isBadRequest());
    }
}
