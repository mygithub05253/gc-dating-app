package com.ember.ember.admin.domain.inbox;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 관리자별 알림 구독 설정 (명세서 v2.3 §11.2 - admin_notification_subscription).
 *
 * <p>WARN/INFO 등급 알림은 이 구독 설정에 따라 발송 여부와 채널이 결정된다.
 * CRITICAL은 구독 설정과 무관하게 ADMIN 이상 전원에게 강제 발송된다.</p>
 *
 * <p>category가 'ALL'인 경우 모든 카테고리에 대해 적용된다.
 * 채널은 콤마 구분 문자열(EMAIL,SLACK,IN_APP)로 저장한다.</p>
 */
@Entity
@Table(name = "admin_notification_subscription")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AdminNotificationSubscription extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "admin_id", nullable = false)
    private Long adminId;

    @Column(nullable = false, length = 40)
    private String category;

    @Column(name = "alert_level", nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private AdminNotification.NotificationType alertLevel;

    @Column(nullable = false, length = 100)
    private String channels;

    @Builder
    private AdminNotificationSubscription(Long adminId,
                                          String category,
                                          AdminNotification.NotificationType alertLevel,
                                          String channels) {
        this.adminId = adminId;
        this.category = category;
        this.alertLevel = alertLevel;
        this.channels = channels;
    }

    public void update(AdminNotification.NotificationType alertLevel, String channels) {
        this.alertLevel = alertLevel;
        this.channels = channels;
    }
}
