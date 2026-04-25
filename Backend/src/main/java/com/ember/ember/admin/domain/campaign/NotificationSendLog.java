package com.ember.ember.admin.domain.campaign;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 캠페인 사용자별 발송 이력 (명세 v2.3 §11.1.3 Step 4).
 *
 * <p>유니크 제약 (campaign_id + user_id + send_type) 으로 중복 발송 차단.
 * Phase 2-A에서는 엔티티만 정의하고, Phase 2-B 발송 워커가 실제 INSERT 수행.</p>
 */
@Entity
@Table(name = "notification_send_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NotificationSendLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "campaign_id", nullable = false)
    private Long campaignId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "send_type", nullable = false, length = 10)
    @Enumerated(EnumType.STRING)
    private NotificationCampaign.SendType sendType;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private SendStatus status;

    @Column(name = "failure_reason", length = 255)
    private String failureReason;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt = LocalDateTime.now();

    @Column(name = "opened_at")
    private LocalDateTime openedAt;

    @Column(name = "clicked_at")
    private LocalDateTime clickedAt;

    @Builder
    private NotificationSendLog(Long campaignId, Long userId, NotificationCampaign.SendType sendType,
                                SendStatus status, String failureReason) {
        this.campaignId = campaignId;
        this.userId = userId;
        this.sendType = sendType;
        this.status = status;
        this.failureReason = failureReason;
        this.sentAt = LocalDateTime.now();
    }

    public void markOpened() {
        this.openedAt = LocalDateTime.now();
    }

    public void markClicked() {
        this.clickedAt = LocalDateTime.now();
    }

    public enum SendStatus {
        SUCCESS,
        FAILED
    }
}
