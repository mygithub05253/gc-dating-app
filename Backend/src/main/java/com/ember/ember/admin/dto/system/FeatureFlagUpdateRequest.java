package com.ember.ember.admin.dto.system;

import jakarta.validation.constraints.NotNull;

public record FeatureFlagUpdateRequest(
        @NotNull Boolean enabled,
        String reason
) {
}
