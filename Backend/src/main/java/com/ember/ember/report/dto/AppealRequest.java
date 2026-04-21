package com.ember.ember.report.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "제재 이의신청 요청")
public record AppealRequest(

        @Schema(description = "이의신청 대상 제재 ID")
        @NotNull(message = "제재 ID는 필수입니다.")
        Long sanctionId,

        @Schema(description = "이의신청 사유 (20~500자)")
        @NotNull(message = "이의신청 사유는 필수입니다.")
        @Size(min = 20, max = 500, message = "이의신청 사유는 20자 이상 500자 이하여야 합니다.")
        String reason
) {
}
