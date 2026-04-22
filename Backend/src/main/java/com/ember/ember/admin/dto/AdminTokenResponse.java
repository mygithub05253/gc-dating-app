package com.ember.ember.admin.dto;

import com.ember.ember.admin.domain.AdminAccount;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "관리자 로그인 토큰 응답")
public record AdminTokenResponse(

        @Schema(description = "JWT accessToken (30분)")
        String accessToken,

        @Schema(description = "JWT refreshToken (7일)")
        String refreshToken,

        @Schema(description = "관리자 역할", example = "ADMIN")
        AdminAccount.AdminRole role,

        @Schema(description = "관리자 고유 ID")
        Long adminId,

        @Schema(description = "관리자 이메일")
        String email
) {
}
