package com.ember.ember.notification.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "알림 설정 수정 요청 (null인 필드는 변경하지 않음)")
public record NotificationSettingRequest(

        @Schema(description = "매칭 알림")
        Boolean matching,

        @Schema(description = "교환일기 차례 알림")
        Boolean diaryTurn,

        @Schema(description = "채팅 알림")
        Boolean chat,

        @Schema(description = "AI 분석 완료 알림")
        Boolean aiAnalysis,

        @Schema(description = "커플 관련 알림")
        Boolean couple,

        @Schema(description = "공지/시스템 알림")
        Boolean system
) {
}
