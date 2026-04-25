package com.ember.ember.admin.dto.automation;

import com.ember.ember.admin.domain.automation.AutoNotificationRule;
import com.ember.ember.admin.domain.automation.AutoNotificationRule.NotificationChannel;

import java.time.LocalDateTime;

public record AutoNotificationRuleResponse(
        Long id,
        String name,
        String description,
        String triggerCondition,
        NotificationChannel notificationChannel,
        String templateContent,
        boolean enabled,
        LocalDateTime lastTriggeredAt,
        LocalDateTime createdAt
) {
    public static AutoNotificationRuleResponse from(AutoNotificationRule rule) {
        return new AutoNotificationRuleResponse(
                rule.getId(),
                rule.getName(),
                rule.getDescription(),
                rule.getTriggerCondition(),
                rule.getNotificationChannel(),
                rule.getTemplateContent(),
                rule.isEnabled(),
                rule.getLastTriggeredAt(),
                rule.getCreatedAt()
        );
    }
}
