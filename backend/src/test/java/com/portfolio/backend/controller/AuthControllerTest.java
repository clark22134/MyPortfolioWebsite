package com.portfolio.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.portfolio.backend.dto.LoginRequest;
import com.portfolio.backend.dto.LoginResponse;
import com.portfolio.backend.dto.RegisterRequest;
import com.portfolio.backend.entity.RefreshToken;
import com.portfolio.backend.entity.User;
import com.portfolio.backend.security.CookieUtil;
import com.portfolio.backend.security.JwtUtil;
import com.portfolio.backend.security.RateLimitingService;
import com.portfolio.backend.service.AuthService;
import com.portfolio.backend.service.CustomUserDetailsService;
import com.portfolio.backend.service.RefreshTokenService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private AuthService authService;
    
    @MockitoBean
    private RateLimitingService rateLimitingService;
    
    @MockitoBean
    private RefreshTokenService refreshTokenService;
    
    @MockitoBean
    private JwtUtil jwtUtil;
    
    @MockitoBean
    private CookieUtil cookieUtil;
    
    @MockitoBean
    private CustomUserDetailsService userDetailsService;
    
    private User mockUser;
    private RefreshToken mockRefreshToken;
    private LoginResponse mockLoginResponse;
    
    @BeforeEach
    void setUp() {
        // Setup mock user
        mockUser = new User();
        mockUser.setId(1L);
        mockUser.setUsername("testuser");
        mockUser.setEmail("test@example.com");
        mockUser.setFullName("Test User");
        mockUser.setPassword("encodedPassword");
        
        // Setup mock login response
        mockLoginResponse = new LoginResponse("mock-jwt-token", "testuser", "test@example.com", "Test User");
        
        // Setup mock refresh token
        mockRefreshToken = new RefreshToken();
        mockRefreshToken.setId(1L);
        mockRefreshToken.setToken(UUID.randomUUID().toString());
        mockRefreshToken.setUser(mockUser);
        mockRefreshToken.setExpiryDate(Instant.now().plusSeconds(604800));
        
        // Default: not rate limited
        when(rateLimitingService.isRateLimited(anyString())).thenReturn(false);
        when(rateLimitingService.getRemainingAttempts(anyString())).thenReturn(5);
        
        // Mock UserDetailsService
        UserDetails userDetails = org.springframework.security.core.userdetails.User
                .withUsername("testuser")
                .password("encodedPassword")
                .authorities("ROLE_USER")
                .build();
        when(userDetailsService.loadUserByUsername(anyString())).thenReturn(userDetails);
        
        // Mock JwtUtil
        when(jwtUtil.generateAccessToken(any(UserDetails.class))).thenReturn("mock-access-token");
        
        // Mock CookieUtil
        Cookie accessCookie = new Cookie("access_token", "mock-access-token");
        accessCookie.setPath("/");
        Cookie refreshCookie = new Cookie("refresh_token", mockRefreshToken.getToken());
        refreshCookie.setPath("/");
        when(cookieUtil.createAccessTokenCookie(anyString())).thenReturn(accessCookie);
        when(cookieUtil.createRefreshTokenCookie(anyString())).thenReturn(refreshCookie);
        doNothing().when(cookieUtil).addCookieWithSameSite(any(), any(), anyString());
        
        // Mock AuthService.login - make this explicit
        when(authService.login(any(LoginRequest.class))).thenReturn(mockLoginResponse);
        when(authService.findByUsername(anyString())).thenReturn(mockUser);
        
        // Mock RefreshTokenService - use any() for userAgent since MockMvc doesn't set User-Agent header
        when(refreshTokenService.createRefreshToken(any(User.class), any(), anyString()))
                .thenReturn(mockRefreshToken);
    }

    @Test
    void login_WithValidCredentials_ShouldReturnUserInfoAndSetCookies() throws Exception {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("testuser");
        loginRequest.setPassword("Password123!");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.fullName").value("Test User"));
    }

    @Test
    void login_WithInvalidCredentials_ShouldReturnUnauthorized() throws Exception {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("wronguser");
        loginRequest.setPassword("WrongPassword123!");

        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new RuntimeException("Invalid credentials"));

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid credentials"));
    }
    
    @Test
    void login_WhenRateLimited_ShouldReturnTooManyRequests() throws Exception {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("testuser");
        loginRequest.setPassword("Password123!");

        when(rateLimitingService.isRateLimited(anyString())).thenReturn(true);
        when(rateLimitingService.getSecondsUntilUnlock(anyString())).thenReturn(1800L);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error").value("Too many failed login attempts"));
    }

    @Test
    void register_WithValidData_ShouldReturnSuccess() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername("newuser");
        registerRequest.setPassword("Password123!");
        registerRequest.setEmail("newuser@example.com");
        registerRequest.setFullName("New User");

        User newUser = new User();
        newUser.setId(1L);
        newUser.setUsername("newuser");
        newUser.setEmail("newuser@example.com");
        newUser.setFullName("New User");

        when(authService.register(any(RegisterRequest.class))).thenReturn(newUser);

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("newuser"));
    }

    @Test
    void register_WithMissingFields_ShouldReturnBadRequest() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername("newuser");
        // Missing password and email - validation should fail

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isBadRequest());
    }
    
    @Test
    void register_WithWeakPassword_ShouldReturnBadRequest() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername("newuser");
        registerRequest.setPassword("weak"); // Too short and missing requirements
        registerRequest.setEmail("newuser@example.com");
        registerRequest.setFullName("New User");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isBadRequest());
    }
    
    @Test
    void register_WithInvalidEmail_ShouldReturnBadRequest() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername("newuser");
        registerRequest.setPassword("Password123!");
        registerRequest.setEmail("not-an-email"); // Invalid email format
        registerRequest.setFullName("New User");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_WithEmptyBody_ShouldReturnBadRequest() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest());
    }
}
