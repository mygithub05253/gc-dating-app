package com.ember.ember.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "FCM 토큰 등록/갱신 요청")
public record FcmTokenRequest(

        @Schema(description = "FCM 디바이스 토큰")
        @NotBlank(message = "fcmToken은 필수입니다.")
        String fcmToken,

        @Schema(description = "디바이스 타입 (AOS/IOS)", example = "AOS")
        @NotBlank(message = "deviceType은 필수입니다.")
        String deviceType
) {
}
