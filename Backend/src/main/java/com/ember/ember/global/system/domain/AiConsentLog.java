package com.ember.ember.global.system.domain;

import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_consent_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiConsentLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 15)
    private String action;

    @Column(name = "consent_type", nullable = false, length = 30)
    private String consentType;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "acted_at", nullable = false)
    private LocalDateTime actedAt;

    @Builder
    public AiConsentLog(User user, String action, String consentType, String ipAddress) {
        this.user = user;
        this.action = action;
        this.consentType = consentType;
        this.ipAddress = ipAddress;
        this.actedAt = LocalDateTime.now();
    }
}
