package com.ember.ember.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "계정 복구 응답")
public record RestoreResponse(

        @Schema(description = "JWT accessToken")
        String accessToken,

        @Schema(description = "JWT refreshToken")
        String refreshToken,

        @Schema(description = "복구된 사용자 ID")
        Long userId
) {
}
