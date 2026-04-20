package com.ember.ember.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

@Schema(description = "프로필 부분 수정 요청")
public record ProfileUpdateRequest(

        @Schema(description = "닉네임 (변경 시에만 포함, 30일 1회 제한)")
        @Size(min = 2, max = 10, message = "닉네임은 2~10자여야 합니다.")
        String nickname,

        @Schema(description = "시/도")
        @Size(max = 20, message = "시/도는 20자 이하여야 합니다.")
        String sido,

        @Schema(description = "시/군/구")
        @Size(max = 20, message = "시/군/구는 20자 이하여야 합니다.")
        String sigungu,

        @Schema(description = "학교명")
        @Size(max = 50, message = "학교명은 50자 이하여야 합니다.")
        String school
) {
}
