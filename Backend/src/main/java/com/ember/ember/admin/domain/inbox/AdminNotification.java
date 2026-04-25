package com.ember.ember.admin.domain.inbox;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 관리자 알림 센터 본체 엔티티 (명세서 v2.3 §11.2).
 *
 * <p>시스템 모니터링 배치, 다른 관리자 기능, SUPER_ADMIN 수동 발행 등 3가지 경로로
 * 생성된다. 알림 유형(CRITICAL/WARN/INFO) 별 채널 정책은 발송 모듈에서 결정한다.</p>
 */
@Entity
@Table(name = "admin_notification")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AdminNotification extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "notification_type", nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private NotificationType notificationType;

    @Column(nullable = false, length = 40)
    private String category;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "source_type", nullable = false, length = 60)
    private String sourceType;

    @Column(name = "source_id", length = 64)
    private String sourceId;

    @Column(name = "action_url", length = 500)
    private String actionUrl;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private Status status = Status.UNREAD;

    @Column(name = "assigned_to")
    private Long assignedTo;

    @Column(name = "resolved_by")
    private Long resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "extra_payload", columnDefinition = "TEXT")
    private String extraPayload;

    @Column(name = "grouped_count", nullable = false)
    private Integer groupedCount = 1;

    @Builder
    private AdminNotification(NotificationType notificationType,
                              String category,
                              String title,
                              String message,
                              String sourceType,
                              String sourceId,
                              String actionUrl,
                              Long assignedTo,
                              String extraPayload) {
        this.notificationType = notificationType;
        this.category = category;
        this.title = title;
        this.message = message;
        this.sourceType = sourceType;
        this.sourceId = sourceId;
        this.actionUrl = actionUrl;
        this.assignedTo = assignedTo;
        this.extraPayload = extraPayload;
        this.status = Status.UNREAD;
        this.groupedCount = 1;
    }

    /** 읽음 처리 (UNREAD → READ). 이미 RESOLVED인 경우는 변경하지 않는다. */
    public boolean markAsRead() {
        if (this.status == Status.UNREAD) {
            this.status = Status.READ;
            return true;
        }
        return false;
    }

    /** 담당자 할당. 비활성 검증은 서비스 계층에서 사전 수행한다. */
    public void assignTo(Long adminId) {
        this.assignedTo = adminId;
    }

    /** 비활성 관리자 알림은 미할당으로 되돌린다 (Edge Case 4). */
    public void unassign() {
        this.assignedTo = null;
    }

    /** 처리 완료 처리. 이미 RESOLVED면 호출자가 409 처리. */
    public boolean resolve(Long adminId) {
        if (this.status == Status.RESOLVED) {
            return false;
        }
        this.status = Status.RESOLVED;
        this.resolvedBy = adminId;
        this.resolvedAt = LocalDateTime.now();
        return true;
    }

    /** Edge Case 2: 5분 내 동일 source_type 묶음 처리용 누적 카운트. */
    public void incrementGroupedCount() {
        this.groupedCount = this.groupedCount + 1;
    }

    public enum NotificationType {
        CRITICAL, WARN, INFO
    }

    public enum Status {
        UNREAD, READ, RESOLVED
    }
}
