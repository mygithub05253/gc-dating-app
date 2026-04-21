package com.ember.ember.notification.dto;

import com.ember.ember.user.domain.UserNotificationSetting;
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
    public static NotificationSettingResponse from(UserNotificationSetting s) {
        return new NotificationSettingResponse(
                s.getMatchingEnabled(), s.getDiaryTurnEnabled(), s.getChatEnabled(),
                s.getAiAnalysisEnabled(), s.getCoupleEnabled(), s.getSystemEnabled(),
                s.getModifiedAt()
        );
    }
}
