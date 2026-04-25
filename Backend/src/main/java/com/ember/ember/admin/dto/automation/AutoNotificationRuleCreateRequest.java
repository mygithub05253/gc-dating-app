package com.ember.ember.admin.dto.automation;

import com.ember.ember.admin.domain.automation.AutoNotificationRule.NotificationChannel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AutoNotificationRuleCreateRequest(
        @NotBlank String name,
        String description,
        String triggerCondition,
        @NotNull NotificationChannel notificationChannel,
        String templateContent
) {
}
