package com.ember.ember.idealtype.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_personality_keywords")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserPersonalityKeyword extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "tag_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private TagType tagType;

    @Column(nullable = false, length = 50)
    private String label;

    @Column(nullable = false, precision = 6, scale = 4)
    private BigDecimal weight;

    @Column(name = "analysis_status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private AnalysisStatus analysisStatus = AnalysisStatus.INSUFFICIENT_DATA;

    @Column(name = "analyzed_diary_count", nullable = false)
    private Integer analyzedDiaryCount = 0;

    @Column(name = "last_analyzed_at")
    private LocalDateTime lastAnalyzedAt;

    public enum TagType {
        EMOTION, LIFESTYLE, RELATIONSHIP_STYLE, TONE
    }

    public enum AnalysisStatus {
        INSUFFICIENT_DATA, COMPLETED
    }

    // -------------------------------------------------------------------------
    // 팩토리 메서드
    // -------------------------------------------------------------------------

    /**
     * 라이프스타일 분석 결과로부터 신규 퍼스널리티 키워드 레코드 생성.
     *
     * @param user      대상 사용자
     * @param tagType   태그 유형
     * @param label     태그 레이블
     * @param score     초기 가중치 점수
     * @param diaryCount 분석에 사용된 일기 편수
     * @return 신규 UserPersonalityKeyword 인스턴스
     */
    public static UserPersonalityKeyword create(
            User user, TagType tagType, String label, BigDecimal score, int diaryCount) {
        UserPersonalityKeyword kw = new UserPersonalityKeyword();
        kw.user = user;
        kw.tagType = tagType;
        kw.label = label;
        kw.weight = score;
        kw.analysisStatus = AnalysisStatus.COMPLETED;
        kw.analyzedDiaryCount = diaryCount;
        kw.lastAnalyzedAt = LocalDateTime.now();
        return kw;
    }

    // -------------------------------------------------------------------------
    // 도메인 상태 변경 메서드
    // -------------------------------------------------------------------------

    /**
     * 기존 키워드 가중치 누적 업데이트.
     * 라이프스타일 재분석 시 이전 score에 새 score를 더하고 분석 일기 수를 갱신.
     *
     * @param additionalScore 추가할 score
     * @param newDiaryCount   최신 분석 일기 편수
     */
    public void accumulateScore(BigDecimal additionalScore, int newDiaryCount) {
        this.weight = this.weight.add(additionalScore);
        this.analyzedDiaryCount = newDiaryCount;
        this.analysisStatus = AnalysisStatus.COMPLETED;
        this.lastAnalyzedAt = LocalDateTime.now();
    }
}
