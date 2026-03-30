package com.portfolio.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Entity for storing refresh tokens in the database.
 * Refresh tokens are long-lived and used to obtain new access tokens.
 */
@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
@NoArgsConstructor
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private Instant expiryDate;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column
    private String userAgent;

    @Column
    private String ipAddress;

    @Column(nullable = false)
    private boolean revoked = false;

    public boolean isExpired() {
        return Instant.now().isAfter(this.expiryDate);
    }

    public boolean isValid() {
        return !isRevoked() && !isExpired();
    }
}
