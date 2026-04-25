package com.ember.ember.admin.dto.system;

import com.ember.ember.admin.domain.system.FeatureFlag;
import com.ember.ember.admin.domain.system.FeatureFlag.FlagCategory;

import java.time.LocalDateTime;

public record FeatureFlagResponse(
        Long id,
        String flagKey,
        String description,
        FlagCategory category,
        boolean enabled,
        Long updatedBy,
        LocalDateTime updatedAt
) {
    public static FeatureFlagResponse from(FeatureFlag flag) {
        return new FeatureFlagResponse(
                flag.getId(),
                flag.getFlagKey(),
                flag.getDescription(),
                flag.getCategory(),
                flag.isEnabled(),
                flag.getUpdatedBy(),
                flag.getModifiedAt()
        );
    }
}
