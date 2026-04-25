package com.ember.ember.admin.dto.system;

import jakarta.validation.constraints.NotNull;

public record FeatureFlagRollbackRequest(
        @NotNull Long historyId
) {
}
