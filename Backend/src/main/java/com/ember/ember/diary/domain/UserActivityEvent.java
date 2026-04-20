package com.ember.ember.diary.domain;

import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_activity_events",
        indexes = @Index(name = "idx_activity_user_occurred", columnList = "user_id, occurred_at"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserActivityEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "event_type", nullable = false, length = 30)
    private String eventType;

    @Column(name = "target_type", length = 30)
    private String targetType;

    @Column(name = "target_id")
    private Long targetId;

    @Column(columnDefinition = "TEXT")
    private String detail;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @Builder
    public UserActivityEvent(User user, String eventType, String targetType, Long targetId, String detail) {
        this.user = user;
        this.eventType = eventType;
        this.targetType = targetType;
        this.targetId = targetId;
        this.detail = detail;
        this.occurredAt = LocalDateTime.now();
    }

    /**
     * 활동 이벤트 생성 팩토리 메서드.
     *
     * @param user       이벤트 발생 사용자
     * @param eventType  이벤트 유형 (예: AI_ANALYSIS_COMPLETED, AI_ANALYSIS_FAILED)
     * @param targetType 대상 엔티티 유형 (예: DIARY)
     * @param targetId   대상 엔티티 PK
     * @param detail     추가 상세 정보 (JSON 또는 plain text)
     */
    public static UserActivityEvent of(User user, String eventType,
                                       String targetType, Long targetId, String detail) {
        UserActivityEvent event = new UserActivityEvent();
        event.user = user;
        event.eventType = eventType;
        event.targetType = targetType;
        event.targetId = targetId;
        event.detail = detail;
        event.occurredAt = LocalDateTime.now();
        return event;
    }
}
