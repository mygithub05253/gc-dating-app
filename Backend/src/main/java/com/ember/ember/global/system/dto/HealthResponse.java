package com.ember.ember.global.system.dto;

import java.time.LocalDateTime;

public record HealthResponse(
        String status,
        String profile,
        LocalDateTime timestamp
) {
    public static HealthResponse of(String profile) {
        return new HealthResponse("ok", profile, LocalDateTime.now());
    }
}
