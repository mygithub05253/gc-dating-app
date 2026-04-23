package com.ember.ember.report.domain;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 외부 연락처 감지 — 관리자 API v2.1 §5.10 / §5.11.
 * AI 파이프라인이 일기/채팅에서 전화번호·카카오 ID·인스타그램 핸들 등을 탐지해 이 테이블에 적재.
 */
@Entity
@Table(name = "contact_detections")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ContactDetection extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "content_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ContentType contentType;

    @Column(name = "content_id")
    private Long contentId;

    @Column(name = "detected_text", nullable = false, length = 300)
    private String detectedText;

    @Column(name = "pattern_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private PatternType patternType;

    @Column(columnDefinition = "TEXT")
    private String context;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private Status status = Status.PENDING;

    @Column(name = "action_type", length = 30)
    @Enumerated(EnumType.STRING)
    private ActionType actionType;

    @Column(nullable = false)
    private Integer confidence = 0;

    @Column(name = "admin_memo", columnDefinition = "TEXT")
    private String adminMemo;

    @Column(name = "detected_at", nullable = false)
    private LocalDateTime detectedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private AdminAccount reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    public enum ContentType {
        DIARY, EXCHANGE_DIARY, CHAT_MESSAGE
    }

    public enum PatternType {
        PHONE, EMAIL, KAKAO, INSTAGRAM, LINK, OTHER
    }

    public enum Status {
        PENDING, CONFIRMED, FALSE_POSITIVE
    }

    public enum ActionType {
        HIDE_AND_WARN, ESCALATE_TO_REPORT, DISMISS
    }

    public static ContactDetection create(User user, ContentType contentType, Long contentId,
                                           String detectedText, PatternType patternType,
                                           String context, int confidence,
                                           LocalDateTime detectedAt) {
        ContactDetection d = new ContactDetection();
        d.user = user;
        d.contentType = contentType;
        d.contentId = contentId;
        d.detectedText = detectedText;
        d.patternType = patternType;
        d.context = context;
        d.confidence = confidence;
        d.detectedAt = detectedAt;
        d.status = Status.PENDING;
        return d;
    }

    /**
     * 관리자 조치 적용 — §5.11.
     * HIDE_AND_WARN / ESCALATE_TO_REPORT → CONFIRMED.
     * DISMISS → FALSE_POSITIVE.
     */
    public void applyAction(ActionType action, String adminMemo, AdminAccount admin) {
        if (this.status != Status.PENDING) {
            throw new IllegalStateException("이미 처리된 감지 항목입니다.");
        }
        this.actionType = action;
        this.adminMemo = adminMemo;
        this.reviewedBy = admin;
        this.reviewedAt = LocalDateTime.now();
        this.status = switch (action) {
            case HIDE_AND_WARN, ESCALATE_TO_REPORT -> Status.CONFIRMED;
            case DISMISS -> Status.FALSE_POSITIVE;
        };
    }
}
