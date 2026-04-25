package com.ember.ember.admin.domain.automation;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 자동 알림 규칙 — 관리자 자동화 모듈.
 * 트리거 조건에 부합하면 지정 채널로 알림을 자동 발송한다.
 */
@Entity
@Table(name = "auto_notification_rules")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AutoNotificationRule extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(name = "trigger_condition", columnDefinition = "TEXT")
    private String triggerCondition;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_channel", nullable = false, length = 20)
    private NotificationChannel notificationChannel;

    @Column(name = "template_content", columnDefinition = "TEXT")
    private String templateContent;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "last_triggered_at")
    private LocalDateTime lastTriggeredAt;

    public enum NotificationChannel {
        PUSH, EMAIL, IN_APP
    }

    /** 자동 알림 규칙 생성 팩터리 */
    public static AutoNotificationRule create(String name, String description,
                                              String triggerCondition,
                                              NotificationChannel channel,
                                              String templateContent) {
        AutoNotificationRule rule = new AutoNotificationRule();
        rule.name = name;
        rule.description = description;
        rule.triggerCondition = triggerCondition;
        rule.notificationChannel = channel;
        rule.templateContent = templateContent;
        rule.enabled = true;
        return rule;
    }

    /** 활성/비활성 토글 */
    public void toggle() {
        this.enabled = !this.enabled;
    }
}
