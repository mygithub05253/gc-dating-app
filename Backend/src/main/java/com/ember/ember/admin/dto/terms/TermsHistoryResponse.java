package com.ember.ember.admin.dto.terms;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * 약관 변경 이력 응답 — §10 약관 관리.
 */
@Schema(description = "약관 변경 이력 응답")
public record TermsHistoryResponse(
        @Schema(description = "로그 ID") Long id,
        @Schema(description = "관리자 ID") Long adminId,
        @Schema(description = "관리자 이름") String adminName,
        @Schema(description = "액션", example = "TERMS_CREATE") String action,
        @Schema(description = "대상 약관 ID") Long targetId,
        @Schema(description = "상세 내용 (JSON 원문)") String detail,
        @Schema(description = "요청 IP") String ipAddress,
        @Schema(description = "수행 시각") LocalDateTime performedAt
) {}
