package com.ember.ember.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "관리자 AccessToken 재발급 응답")
public record AdminAccessTokenResponse(

        @Schema(description = "새로 발급된 JWT accessToken (30분)")
        String accessToken
) {
}
