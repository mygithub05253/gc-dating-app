package com.ember.ember.aireport.domain;

import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 라이프스타일 분석 이력 엔티티 (M6).
 *
 * KcELECTRA 기반 라이프스타일 분석 완료 시 이력을 누적 저장한다.
 * 분석 품질 추적, 관리자 감사, 디버깅 용도로 활용.
 *
 * 저장 시점:
 *   LifestyleAnalysisResultHandler.handleCompleted() 처리 완료 후 INSERT.
 */
@Entity
@Table(
    name = "lifestyle_analysis_log",
    indexes = {
        @Index(
            name = "idx_lifestyle_analysis_log_user_id_analyzed_at",
            columnList = "user_id, analyzed_at DESC"
        )
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LifestyleAnalysisLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * 분석 완료 시각 (FastAPI가 반환한 analyzedAt 기준).
     */
    @Column(name = "analyzed_at", nullable = false)
    private LocalDateTime analyzedAt;

    /**
     * 분석에 사용된 일기 편수 (최대 10편).
     */
    @Column(name = "diary_count", nullable = false)
    private int diaryCount;

    /**
     * 주요 라이프스타일 패턴 top 3~5.
     * 예: ["아침형", "야외활동", "사교적"]
     */
    @Column(name = "dominant_patterns", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> dominantPatterns;

    /**
     * 감정 비율 프로필.
     * {"positive": 0.6, "negative": 0.2, "neutral": 0.2}
     */
    @Column(name = "emotion_profile", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Double> emotionProfile;

    /**
     * AI 생성 라이프스타일 설명 (한국어, 60자 이내).
     */
    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    /**
     * FastAPI 원본 응답 전체 (감사·디버깅용).
     * 재처리 또는 분석 결과 검증 시 활용.
     */
    @Column(name = "raw_result", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> rawResult;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    // -------------------------------------------------------------------------
    // 팩토리 메서드
    // -------------------------------------------------------------------------

    /**
     * LifestyleAnalysisLog 신규 생성 팩토리 메서드.
     *
     * @param user             분석 대상 사용자
     * @param analyzedAt       분석 완료 시각
     * @param diaryCount       분석에 사용된 일기 편수
     * @param dominantPatterns 주요 패턴 목록
     * @param emotionProfile   감정 비율 맵
     * @param summary          AI 생성 설명
     * @param rawResult        FastAPI 원본 응답
     * @return 새 LifestyleAnalysisLog 인스턴스
     */
    public static LifestyleAnalysisLog create(
            User user,
            LocalDateTime analyzedAt,
            int diaryCount,
            List<String> dominantPatterns,
            Map<String, Double> emotionProfile,
            String summary,
            Map<String, Object> rawResult) {

        LifestyleAnalysisLog log = new LifestyleAnalysisLog();
        log.user = user;
        log.analyzedAt = analyzedAt != null ? analyzedAt : LocalDateTime.now();
        log.diaryCount = diaryCount;
        log.dominantPatterns = dominantPatterns;
        log.emotionProfile = emotionProfile;
        log.summary = summary;
        log.rawResult = rawResult;
        return log;
    }
}
