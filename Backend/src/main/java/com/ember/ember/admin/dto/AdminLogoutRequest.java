package com.ember.ember.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "관리자 로그아웃 요청(refreshToken은 선택)")
public record AdminLogoutRequest(

        @Schema(description = "Refresh Token (선택)")
        String refreshToken
) {
}
