package com.ember.ember.admin.dto.automation;

import com.ember.ember.admin.domain.automation.AutoSanctionRule.SanctionAction;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AutoSanctionRuleCreateRequest(
        @NotBlank String name,
        String description,
        String conditionJson,
        @NotNull SanctionAction action
) {
}
