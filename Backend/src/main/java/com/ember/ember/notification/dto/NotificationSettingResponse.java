package com.ember.ember.notification.dto;

import com.ember.ember.notification.domain.NotificationSetting;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "알림 설정 응답")
public record NotificationSettingResponse(

        boolean matching,
        boolean diaryTurn,
        boolean chat,
        boolean aiAnalysis,
        boolean couple,
        boolean system,

        @Schema(description = "설정 변경 일시")
        LocalDateTime updatedAt
) {
    public static NotificationSettingResponse from(NotificationSetting s) {
        return new NotificationSettingResponse(
                s.getMatching(), s.getDiaryTurn(), s.getChat(),
                s.getAiAnalysis(), s.getCouple(), s.getSystem(),
                s.getModifiedAt()
        );
    }
}
