package com.ember.ember.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "관리자 비밀번호 변경 응답")
public record AdminPasswordChangeResponse(

        @Schema(description = "처리 결과 메시지", example = "비밀번호가 변경되었습니다")
        String message,

        @Schema(description = "로그아웃된 세션 수 (logoutOtherSessions=true일 때 1, 그 외 0)")
        int loggedOutSessions
) {
}
