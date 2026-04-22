package com.ember.ember.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * 관리자 활동 로그 응답 — login_logs ∪ password_change_logs 통합 뷰.
 */
@Schema(description = "관리자 활동 로그 응답")
public record AdminActivityLogResponse(
        @Schema(description = "발생 시각") LocalDateTime occurredAt,
        @Schema(description = "액션 유형", example = "LOGIN | LOGOUT | PASSWORD_CHANGE") String actionType,
        @Schema(description = "IP 주소") String ipAddress,
        @Schema(description = "User-Agent (비밀번호 변경 시 null)") String userAgent,
        @Schema(description = "성공 여부 (비밀번호 변경은 항상 true)") boolean success
) {}
