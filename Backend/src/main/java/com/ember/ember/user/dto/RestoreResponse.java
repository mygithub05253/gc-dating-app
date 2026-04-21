package com.ember.ember.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "계정 복구 응답")
public record RestoreResponse(

        @Schema(description = "복구된 사용자 ID")
        Long userId,

        @Schema(description = "복구 일시")
        LocalDateTime restoredAt,

        @Schema(description = "계정 상태")
        String status
) {
}
