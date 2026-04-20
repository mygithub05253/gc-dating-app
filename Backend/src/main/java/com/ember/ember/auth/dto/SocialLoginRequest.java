package com.ember.ember.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "소셜 로그인 요청")
public record SocialLoginRequest(

        @Schema(description = "소셜 provider", example = "KAKAO")
        @NotBlank(message = "provider는 필수입니다.")
        String provider,

        @Schema(description = "소셜 accessToken")
        @NotBlank(message = "socialToken은 필수입니다.")
        String socialToken,

        @Schema(description = "이메일 (카카오 동의 시)")
        String email
) {
}
