package com.ember.ember.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "랜덤 닉네임 생성 응답")
public record NicknameGenerateResponse(

        @Schema(description = "생성된 랜덤 닉네임", example = "용감한별빛")
        String nickname
) {
}
