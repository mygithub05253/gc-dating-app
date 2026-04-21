package com.ember.ember.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

@Schema(description = "회원 탈퇴 요청")
public record DeactivateRequest(

        @Schema(description = "탈퇴 사유", example = "SERVICE_DISSATISFACTION")
        String reason,

        @Schema(description = "상세 설명 (최대 500자)")
        @Size(max = 500, message = "상세 설명은 500자 이하여야 합니다.")
        String detail
) {
}
