package com.portfolio.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@Entity
@Table(name = "projects")
public class Project {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String title;
    
    @Column(length = 2000)
    private String description;
    
    private String imageUrl;
    
    private String githubUrl;
    
    private String demoUrl;
    
    @ElementCollection
    private List<String> technologies;
    
    private LocalDate startDate;
    
    private LocalDate endDate;
    
    private boolean featured;

    public Project() {}

    public Project(Long id, String title, String description, String imageUrl, String githubUrl,
                   String demoUrl, List<String> technologies, LocalDate startDate, LocalDate endDate, boolean featured) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.imageUrl = imageUrl;
        this.githubUrl = githubUrl;
        this.demoUrl = demoUrl;
        this.technologies = technologies;
        this.startDate = startDate;
        this.endDate = endDate;
        this.featured = featured;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getGithubUrl() { return githubUrl; }
    public void setGithubUrl(String githubUrl) { this.githubUrl = githubUrl; }

    public String getDemoUrl() { return demoUrl; }
    public void setDemoUrl(String demoUrl) { this.demoUrl = demoUrl; }

    public List<String> getTechnologies() { return technologies; }
    public void setTechnologies(List<String> technologies) { this.technologies = technologies; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public boolean isFeatured() { return featured; }
    public void setFeatured(boolean featured) { this.featured = featured; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Project project = (Project) o;
        return featured == project.featured &&
               Objects.equals(id, project.id) &&
               Objects.equals(title, project.title) &&
               Objects.equals(description, project.description) &&
               Objects.equals(imageUrl, project.imageUrl) &&
               Objects.equals(githubUrl, project.githubUrl) &&
               Objects.equals(demoUrl, project.demoUrl) &&
               Objects.equals(technologies, project.technologies) &&
               Objects.equals(startDate, project.startDate) &&
               Objects.equals(endDate, project.endDate);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, title, description, imageUrl, githubUrl, demoUrl, technologies, startDate, endDate, featured);
    }

    @Override
    public String toString() {
        return "Project{id=" + id + ", title='" + title + "', featured=" + featured + "}";
    }
}
