package com.portfolio.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "projects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
@ToString
public class Project {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank
    @Size(max = 200)
    @Column(nullable = false)
    private String title;
    
    @Size(max = 2000)
    @Column(length = 2000)
    private String description;
    
    @Size(max = 500)
    private String imageUrl;
    
    @Size(max = 500)
    private String githubUrl;
    
    @Size(max = 500)
    private String demoUrl;
    
    @ElementCollection
    private List<String> technologies;
    
    private LocalDate startDate;
    
    private LocalDate endDate;
    
    private boolean featured;
}
