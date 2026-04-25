package com.ember.ember.admin.dto.event;

public record EventStatusResponse(
        Long id,
        String previousStatus,
        String currentStatus
) {
}
