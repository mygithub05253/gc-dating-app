package com.ember.ember.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "관리자 비밀번호 변경 요청")
public record AdminPasswordChangeRequest(

        @Schema(description = "현재 비밀번호(최소 8자)")
        @NotBlank(message = "currentPassword는 필수입니다.")
        @Size(min = 8, message = "현재 비밀번호는 최소 8자 이상이어야 합니다.")
        String currentPassword,

        @Schema(description = "새 비밀번호(8~128자, 영문 대소문자+숫자+특수문자 조합)")
        @NotBlank(message = "newPassword는 필수입니다.")
        @Size(min = 8, max = 128, message = "새 비밀번호는 8~128자여야 합니다.")
        String newPassword,

        @Schema(description = "다른 세션 로그아웃 여부(기본 true)", defaultValue = "true")
        Boolean logoutOtherSessions
) {
}
