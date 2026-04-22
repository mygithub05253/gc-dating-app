package com.ember.ember.admin.dto.member;

import com.ember.ember.report.domain.SanctionHistory;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * 제재 이력 항목 — 관리자 API §3.7.
 */
@Schema(description = "제재 이력 항목")
public record AdminSanctionHistoryItemResponse(
        @Schema(description = "이력 ID") Long id,
        @Schema(description = "제재 유형") SanctionHistory.SanctionType sanctionType,
        @Schema(description = "사유") String reason,
        @Schema(description = "사유 분류") String reasonCategory,
        @Schema(description = "이전 상태") String previousStatus,
        @Schema(description = "집행 관리자 ID") Long adminId,
        @Schema(description = "집행 관리자 이름") String adminName,
        @Schema(description = "연관 신고 ID") Long reportId,
        @Schema(description = "제재 시작") LocalDateTime startedAt,
        @Schema(description = "제재 종료") LocalDateTime endedAt
) {
    public static AdminSanctionHistoryItemResponse from(SanctionHistory h) {
        Long adminId = (h.getAdmin() != null) ? h.getAdmin().getId() : null;
        String adminName = (h.getAdmin() != null) ? h.getAdmin().getName() : null;
        Long reportId = (h.getReport() != null) ? h.getReport().getId() : null;
        return new AdminSanctionHistoryItemResponse(
                h.getId(), h.getSanctionType(), h.getReason(), h.getReasonCategory(),
                h.getPreviousStatus(), adminId, adminName, reportId,
                h.getStartedAt(), h.getEndedAt()
        );
    }
}
