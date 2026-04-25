package com.ember.ember.admin.dto.event;

import jakarta.validation.constraints.NotNull;

public record EventStatusRequest(
        @NotNull String status,
        String reason
) {
}
