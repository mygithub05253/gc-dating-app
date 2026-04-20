package com.ember.ember.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "프로필 등록 응답")
public record ProfileResponse(

        @Schema(description = "사용자 ID")
        Long userId,

        @Schema(description = "등록된 닉네임")
        String nickname
) {
}
