package com.ember.ember.admin.dto.automation;

import com.ember.ember.admin.domain.automation.AutoSanctionRule;
import com.ember.ember.admin.domain.automation.AutoSanctionRule.SanctionAction;

import java.time.LocalDateTime;

public record AutoSanctionRuleResponse(
        Long id,
        String name,
        String description,
        String conditionJson,
        SanctionAction action,
        boolean enabled,
        int executionCount,
        LocalDateTime lastTriggeredAt,
        LocalDateTime createdAt
) {
    public static AutoSanctionRuleResponse from(AutoSanctionRule rule) {
        return new AutoSanctionRuleResponse(
                rule.getId(),
                rule.getName(),
                rule.getDescription(),
                rule.getConditionJson(),
                rule.getAction(),
                rule.isEnabled(),
                rule.getExecutionCount(),
                rule.getLastTriggeredAt(),
                rule.getCreatedAt()
        );
    }
}
