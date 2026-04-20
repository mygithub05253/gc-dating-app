package com.ember.ember.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "계정 복구 요청")
public record RestoreRequest(

        @Schema(description = "복구 토큰 (소셜 로그인 응답에서 받은 값)")
        @NotBlank(message = "restoreToken은 필수입니다.")
        String restoreToken
) {
}
