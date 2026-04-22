package com.ember.ember.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "관리자 토큰 갱신 요청")
public record AdminRefreshRequest(

        @Schema(description = "관리자 Refresh Token")
        @NotBlank(message = "refreshToken은 필수입니다.")
        String refreshToken
) {
}
