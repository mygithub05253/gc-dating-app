package com.ember.ember.admin.dto.system;

import com.ember.ember.admin.domain.system.FeatureFlagHistory;

import java.time.LocalDateTime;

public record FeatureFlagHistoryResponse(
        Long id,
        String flagKey,
        boolean previousValue,
        boolean newValue,
        String reason,
        Long changedBy,
        LocalDateTime changedAt
) {
    public static FeatureFlagHistoryResponse from(FeatureFlagHistory history) {
        return new FeatureFlagHistoryResponse(
                history.getId(),
                history.getFlagKey(),
                history.isPreviousValue(),
                history.isNewValue(),
                history.getReason(),
                history.getChangedBy(),
                history.getCreatedAt()
        );
    }
}
