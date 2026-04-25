package com.ember.ember.admin.dto;

import com.ember.ember.admin.domain.AdminPasswordChangeLog;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * 비밀번호 변경 로그 응답 — §13 감사 로그 관리.
 */
@Schema(description = "비밀번호 변경 로그 응답")
public record PasswordChangeLogResponse(
        @Schema(description = "로그 ID") Long id,
        @Schema(description = "관리자 ID") Long adminId,
        @Schema(description = "관리자 이름") String adminName,
        @Schema(description = "요청 IP") String ipAddress,
        @Schema(description = "변경 시각") LocalDateTime changedAt
) {
    public static PasswordChangeLogResponse from(AdminPasswordChangeLog log) {
        return new PasswordChangeLogResponse(
                log.getId(),
                log.getAdmin().getId(),
                log.getAdmin().getName(),
                log.getIpAddress(),
                log.getChangedAt()
        );
    }
}
