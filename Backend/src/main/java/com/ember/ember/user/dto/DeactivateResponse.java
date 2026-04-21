package com.ember.ember.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "회원 탈퇴 응답")
public record DeactivateResponse(

        @Schema(description = "탈퇴 요청 일시")
        LocalDateTime deactivatedAt,

        @Schema(description = "영구 삭제 예정 일시 (30일 후)")
        LocalDateTime permanentDeleteAt
) {
}
