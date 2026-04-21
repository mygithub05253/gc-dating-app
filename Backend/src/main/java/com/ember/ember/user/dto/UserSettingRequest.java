package com.ember.ember.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "앱 설정 수정 요청 (null인 필드는 변경하지 않음)")
public record UserSettingRequest(

        @Schema(description = "다크모드")
        Boolean darkMode,

        @Schema(description = "언어 (ko/en)")
        String language,

        @Schema(description = "연령 필터 범위 (1~10)")
        Integer ageFilterRange
) {
}
