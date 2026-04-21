package com.ember.ember.notification.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "알림 읽음 처리 응답")
public record NotificationReadResponse(

        @Schema(description = "알림 ID")
        Long notificationId,

        @Schema(description = "읽음 상태 (항상 true)")
        boolean isRead,

        @Schema(description = "읽음 처리 일시")
        LocalDateTime readAt
) {
}
