package com.ember.ember.notification.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "전체 알림 읽음 처리 응답")
public record ReadAllResponse(

        @Schema(description = "읽음 처리된 알림 수")
        int updatedCount,

        @Schema(description = "일괄 읽음 처리 일시")
        LocalDateTime readAt
) {
}
