package com.ember.ember.global.system.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "약관/동의 등록 요청")
public record ConsentRequest(

        @Schema(description = "동의 유형 (USER_TERMS / AI_TERMS)", example = "AI_TERMS")
        @NotBlank(message = "consentType은 필수입니다.")
        String consentType
) {
}
