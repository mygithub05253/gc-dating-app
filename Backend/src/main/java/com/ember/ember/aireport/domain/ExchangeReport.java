package com.ember.ember.aireport.domain;

import com.ember.ember.exchange.domain.ExchangeRoom;
import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 교환일기 완주 AI 리포트 엔티티
 *
 * 교환일기 방이 완주(RoomStatus.COMPLETED)될 때 1건 생성.
 * 2-party 동의 미획득 → CONSENT_REQUIRED (기본값)
 * 양측 동의 → PROCESSING (FastAPI 처리 중)
 * 완료 → COMPLETED (ai_description 등 결과 저장)
 * 실패 → FAILED (DLQ 소진 후)
 *
 * V4 마이그레이션:
 *   - writing_temperature (TEXT, 구) → writing_temp_a / writing_temp_b (DECIMAL 4,3) 분리
 */
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

    // CONSENT_REQUIRED: 양방향 동의 미획득 상태 (기본값)
    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ReportStatus status = ReportStatus.CONSENT_REQUIRED;

    /** 두 사람의 공통 핵심 키워드 (JSON 배열 문자열, 예: ["음악","여행","카페"]) */
    @Column(name = "common_keywords", columnDefinition = "TEXT")
    private String commonKeywords;

    /** 감정 표현 유사도 (0.000 ~ 1.000, KoSimCSE 코사인 유사도) */
    @Column(name = "emotion_similarity", precision = 4, scale = 3)
    private BigDecimal emotionSimilarity;

    /** 생활 패턴 키워드 (JSON 배열 문자열, 예: ["아침형","야외활동"]) */
    @Column(name = "lifestyle_patterns", columnDefinition = "TEXT")
    private String lifestylePatterns;

    /**
     * userA 글쓰기 온도 (0.000 ~ 1.000, KcELECTRA tone 분석)
     * V4 마이그레이션: writing_temperature → writing_temp_a / writing_temp_b 분리
     */
    @Column(name = "writing_temp_a", precision = 4, scale = 3)
    private BigDecimal writingTempA;

    /** userB 글쓰기 온도 (0.000 ~ 1.000) */
    @Column(name = "writing_temp_b", precision = 4, scale = 3)
    private BigDecimal writingTempB;

    /** AI 생성 두 사람 관계 설명 (한국어 자연어, 최대 500자) */
    @Column(name = "ai_description", columnDefinition = "TEXT")
    private String aiDescription;

    /** 리포트 생성 완료 시각 */
    @Column(name = "generated_at")
    private LocalDateTime generatedAt;

    /**
     * 교환일기 리포트 생성 상태
     * CONSENT_REQUIRED : 양방향 AI 동의 미획득 (기본값, 구 PENDING 대체)
     * PROCESSING       : FastAPI 리포트 생성 중
     * COMPLETED        : 리포트 생성 완료
     * FAILED           : 리포트 생성 실패 (DLQ 소진 후)
     */
    public enum ReportStatus {
        CONSENT_REQUIRED, PROCESSING, COMPLETED, FAILED
    }

    // -------------------------------------------------------------------------
    // 정적 팩토리
    // -------------------------------------------------------------------------

    /**
     * 동의 미획득 리포트 생성 (CONSENT_REQUIRED 상태).
     *
     * @param room 교환방 엔티티
     * @return 저장 전 ExchangeReport
     */
    public static ExchangeReport ofConsentRequired(ExchangeRoom room) {
        ExchangeReport report = new ExchangeReport();
        report.room = room;
        report.status = ReportStatus.CONSENT_REQUIRED;
        return report;
    }

    /**
     * 분석 요청 리포트 생성 (PROCESSING 상태).
     *
     * @param room 교환방 엔티티
     * @return 저장 전 ExchangeReport
     */
    public static ExchangeReport ofProcessing(ExchangeRoom room) {
        ExchangeReport report = new ExchangeReport();
        report.room = room;
        report.status = ReportStatus.PROCESSING;
        return report;
    }

    // -------------------------------------------------------------------------
    // 상태 전이 메서드
    // -------------------------------------------------------------------------

    /**
     * FastAPI 리포트 분석 완료 처리.
     * PROCESSING → COMPLETED 전이, 모든 AI 결과 필드 저장.
     */
    public void completeReport(
            String commonKeywords,
            BigDecimal emotionSimilarity,
            String lifestylePatterns,
            BigDecimal writingTempA,
            BigDecimal writingTempB,
            String aiDescription
    ) {
        this.commonKeywords = commonKeywords;
        this.emotionSimilarity = emotionSimilarity;
        this.lifestylePatterns = lifestylePatterns;
        this.writingTempA = writingTempA;
        this.writingTempB = writingTempB;
        this.aiDescription = aiDescription;
        this.status = ReportStatus.COMPLETED;
        this.generatedAt = LocalDateTime.now();
    }

    /**
     * FastAPI 리포트 분석 실패 처리.
     * PROCESSING → FAILED 전이.
     */
    public void failReport() {
        this.status = ReportStatus.FAILED;
    }

    /**
     * 동의 상태를 CONSENT_REQUIRED로 전환.
     * OutboxRelay 재검증에서 동의 미획득 시 호출.
     */
    public void markConsentRequired() {
        this.status = ReportStatus.CONSENT_REQUIRED;
    }
}
