package com.clarksprojects.ats.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "candidate")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Candidate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(nullable = false)
    private String email;

    private String phone;

    @Column(name = "resume_url")
    private String resumeUrl;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(columnDefinition = "TEXT")
    private String skills;

    private String address;

    private Double latitude;

    private Double longitude;

    @Column(name = "last_assignment_days")
    private Integer lastAssignmentDays;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PipelineStage stage;

    @Column(name = "stage_order")
    private Integer stageOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @CreationTimestamp
    @Column(name = "applied_at", updatable = false)
    private LocalDateTime appliedAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
