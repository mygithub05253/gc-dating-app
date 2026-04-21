package com.ember.ember.user.dto;

import com.ember.ember.user.domain.UserSetting;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "앱 설정 응답")
public record UserSettingResponse(

        boolean darkMode,
        String language,
        int ageFilterRange,
        LocalDateTime updatedAt
) {
    public static UserSettingResponse from(UserSetting s) {
        return new UserSettingResponse(
                s.getTheme() == UserSetting.Theme.DARK,
                s.getLanguage(),
                s.getAgeFilterRange(),
                s.getModifiedAt()
        );
    }
}
