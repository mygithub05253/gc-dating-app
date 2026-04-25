package com.ember.ember.admin.domain.inbox;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 관리자 알림 채널별 발송 이력 (명세서 v2.3 §11.2 - admin_notification_send_log).
 *
 * <p>EMAIL/SLACK/IN_APP 채널 단위로 SUCCESS/FAILED 상태와 재시도 횟수를 기록한다.
 * Edge Case 1(Slack 장애 시 Email 계속 진행)을 위해 채널별 독립 행을 유지한다.</p>
 */
@Entity
@Table(name = "admin_notification_send_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AdminNotificationSendLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "notification_id", nullable = false)
    private Long notificationId;

    @Column(name = "admin_id", nullable = false)
    private Long adminId;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private Channel channel;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private SendStatus status;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "retry_count", nullable = false)
    private Integer retryCount = 0;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    @Builder
    private AdminNotificationSendLog(Long notificationId,
                                     Long adminId,
                                     Channel channel,
                                     SendStatus status,
                                     String errorMessage,
                                     Integer retryCount) {
        this.notificationId = notificationId;
        this.adminId = adminId;
        this.channel = channel;
        this.status = status;
        this.errorMessage = errorMessage;
        this.retryCount = retryCount == null ? 0 : retryCount;
        this.sentAt = LocalDateTime.now();
    }

    public enum Channel {
        EMAIL, SLACK, IN_APP
    }

    public enum SendStatus {
        SUCCESS, FAILED
    }
}
