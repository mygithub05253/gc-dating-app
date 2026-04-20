package com.ember.ember.notification.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "튜토리얼 완료 응답")
public record TutorialCompleteResponse(

        @Schema(description = "완료 처리 성공 여부")
        boolean success,

        @Schema(description = "완료 시각")
        LocalDateTime completedAt
) {
}
