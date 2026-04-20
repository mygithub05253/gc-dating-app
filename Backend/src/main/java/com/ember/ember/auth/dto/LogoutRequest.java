package com.ember.ember.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "로그아웃 요청")
public record LogoutRequest(

        @Schema(description = "Refresh Token")
        @NotBlank(message = "refreshToken은 필수입니다.")
        String refreshToken
) {
}
