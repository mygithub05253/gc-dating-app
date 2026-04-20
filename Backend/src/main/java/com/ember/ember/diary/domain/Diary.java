package com.ember.ember.diary.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.topic.domain.WeeklyTopic;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "diaries",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "date"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Diary extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 100)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    private LocalDate date;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id")
    private WeeklyTopic topic;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private DiaryStatus status = DiaryStatus.SUBMITTED;

    // AI 분석 파이프라인 상태 (사용자 워크플로우 status와 분리)
    @Column(name = "analysis_status", nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private AnalysisStatus analysisStatus = AnalysisStatus.PENDING;

    @Column(length = 100)
    private String summary;

    @Column(length = 20)
    private String category;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private DiaryVisibility visibility = DiaryVisibility.PRIVATE;

    @Column(name = "is_exchanged", nullable = false)
    private Boolean isExchanged = false;

    // -------------------------------------------------------------------------
    // 팩토리 메서드
    // -------------------------------------------------------------------------

    /**
     * 일기 생성 팩토리 메서드.
     * analysisStatus 기본값: PENDING
     */
    public static Diary create(User user, String content, DiaryVisibility visibility) {
        Diary diary = new Diary();
        diary.user = user;
        diary.content = content;
        diary.visibility = visibility;
        diary.date = LocalDate.now();
        diary.analysisStatus = AnalysisStatus.PENDING;
        return diary;
    }

    // -------------------------------------------------------------------------
    // 도메인 상태 변경 메서드
    // -------------------------------------------------------------------------

    /** AI 분석 완료 처리 (summary, category 업데이트 포함) */
    public void completeAnalysis(String summary, String category) {
        this.analysisStatus = AnalysisStatus.COMPLETED;
        this.summary = summary;
        this.category = category;
    }

    /** AI 분석 실패 처리 */
    public void failAnalysis() {
        this.analysisStatus = AnalysisStatus.FAILED;
    }

    /** AI 분석 동의 미획득으로 건너뜀 처리 */
    public void skipAnalysis() {
        this.analysisStatus = AnalysisStatus.SKIPPED;
    }

    /** AI 재분석을 위한 상태 초기화 (수정 시 사용) */
    public void resetAnalysisStatus() {
        this.analysisStatus = AnalysisStatus.PENDING;
    }

    public enum DiaryVisibility {
        /** 본인만 열람 */
        PRIVATE,
        /** 매칭 상대(교환 파트너)도 열람 가능 */
        EXCHANGE_ONLY
    }

    public enum DiaryStatus {
        SUBMITTED, ANALYZING, ANALYZED, SKIPPED
    }

    /** 일기 생성 */
    @Builder
    public Diary(User user, String content, LocalDate date, WeeklyTopic topic) {
        this.user = user;
        this.content = content;
        this.date = date;
        this.topic = topic;
        this.status = DiaryStatus.SUBMITTED;
        this.isExchanged = false;
    }

    /** 일기 본문 수정 (당일만) */
    public void updateContent(String content) {
        this.content = content;
        this.summary = null;
        this.category = null;
        this.status = DiaryStatus.SUBMITTED;
    }

    /** 수정 가능 여부 (당일 KST + 교환 미시작) */
    public boolean isEditable() {
        return this.date.equals(LocalDate.now(java.time.ZoneId.of("Asia/Seoul"))) && !this.isExchanged;
    }

    /**
     * AI 분석 파이프라인 처리 상태
     * PENDING: 분석 대기 (기본값)
     * PROCESSING: FastAPI에서 분석 중
     * COMPLETED: 분석 완료, diary_keywords 저장됨
     * FAILED: 분석 실패 (DLQ 소진 후)
     * SKIPPED: 동의 미획득 또는 조건 미충족으로 분석 생략
     */
    public enum AnalysisStatus {
        PENDING, PROCESSING, COMPLETED, FAILED, SKIPPED
    }
}
