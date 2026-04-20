package com.ember.ember.aireport.domain;

import com.ember.ember.exchange.domain.ExchangeRoom;
import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "exchange_reports")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ExchangeReport extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false, unique = true)
    private ExchangeRoom room;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private ReportStatus status = ReportStatus.PENDING;

    @Column(name = "common_keywords", columnDefinition = "TEXT")
    private String commonKeywords;

    @Column(name = "writing_temperature", columnDefinition = "TEXT")
    private String writingTemperature;

    @Column(name = "emotion_similarity", precision = 4, scale = 3)
    private BigDecimal emotionSimilarity;

    @Column(name = "lifestyle_patterns", columnDefinition = "TEXT")
    private String lifestylePatterns;

    @Column(name = "ai_description", columnDefinition = "TEXT")
    private String aiDescription;

    @Column(name = "generated_at")
    private LocalDateTime generatedAt;

    public enum ReportStatus {
        PENDING, PROCESSING, COMPLETED, FAILED, CONSENT_REQUIRED
    }
}
