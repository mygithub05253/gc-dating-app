package com.ember.ember.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "토큰 응답")
public record TokenResponse(

        @Schema(description = "JWT accessToken")
        String accessToken,

        @Schema(description = "JWT refreshToken")
        String refreshToken
) {
}
