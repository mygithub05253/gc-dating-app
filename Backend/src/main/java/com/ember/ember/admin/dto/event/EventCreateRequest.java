package com.ember.ember.admin.dto.event;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record EventCreateRequest(
        @NotBlank String title,
        String description,
        @NotNull String type,
        @NotNull String target,
        @NotNull LocalDateTime startDate,
        @NotNull LocalDateTime endDate,
        String config
) {
}
