package com.ember.ember.admin.dto.system;

public record BatchJobRunResponse(
        Long executionId,
        String status
) {
}
