package com.ember.ember.admin.dto;

import com.ember.ember.admin.domain.AdminAuditLog;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * 관리자 감사 로그 조회 응답 — 관리자 API 통합명세서 v2.1 §13.8
 * <p>admin_audit_logs 테이블을 AdminAccount와 JOIN 하여 adminName 까지 반환한다.
 * detail 컬럼(JSONB)은 우선 String 원문으로 반환하고, 프런트에서 JSON.parse 하여 before/after diff 뷰를 구성한다.
 */
@Schema(description = "관리자 감사 로그 응답")
public record AdminAuditLogResponse(
        @Schema(description = "로그 ID") Long id,
        @Schema(description = "관리자 ID") Long adminId,
        @Schema(description = "관리자 이름") String adminName,
        @Schema(description = "액션", example = "USER_SUSPEND") String action,
        @Schema(description = "대상 타입", example = "USER | REPORT | NOTICE | ADMIN") String targetType,
        @Schema(description = "대상 ID") Long targetId,
        @Schema(description = "상세 내용 (JSON 원문)") String detail,
        @Schema(description = "요청 IP") String ipAddress,
        @Schema(description = "수행 시각 (ISO 8601)") LocalDateTime performedAt
) {
    public static AdminAuditLogResponse from(AdminAuditLog log) {
        return new AdminAuditLogResponse(
                log.getId(),
                log.getAdmin().getId(),
                log.getAdmin().getName(),
                log.getAction(),
                log.getTargetType(),
                log.getTargetId(),
                log.getDetail(),
                log.getIpAddress(),
                log.getPerformedAt()
        );
    }
}
