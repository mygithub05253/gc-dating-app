package com.ember.ember.admin.dto;

import com.ember.ember.admin.domain.AdminPiiAccessLog;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * PII 접근 로그 응답 — §13 감사 로그 관리.
 */
@Schema(description = "PII 접근 로그 응답")
public record PiiAccessLogResponse(
        @Schema(description = "로그 ID") Long id,
        @Schema(description = "관리자 ID") Long adminId,
        @Schema(description = "관리자 이름") String adminName,
        @Schema(description = "대상 사용자 ID") Long targetUserId,
        @Schema(description = "접근 타입", example = "EMAIL_VIEW") String accessType,
        @Schema(description = "요청 IP") String ipAddress,
        @Schema(description = "접근 시각") LocalDateTime accessedAt
) {
    public static PiiAccessLogResponse from(AdminPiiAccessLog log) {
        return new PiiAccessLogResponse(
                log.getId(),
                log.getAdmin().getId(),
                log.getAdmin().getName(),
                log.getTargetUser().getId(),
                log.getAccessType(),
                log.getIpAddress(),
                log.getAccessedAt()
        );
    }
}
