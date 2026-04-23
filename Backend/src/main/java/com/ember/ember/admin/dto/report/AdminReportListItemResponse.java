package com.ember.ember.admin.dto.report;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.report.domain.Report;
import com.ember.ember.report.service.ReportPriorityCalculator.SlaStatus;

import java.time.LocalDateTime;

/**
 * 관리자 신고 목록 아이템 — 관리자 API v2.1 §5.1 응답 필드.
 */
public record AdminReportListItemResponse(
        Long id,
        Report.ReportReason reason,
        Report.ReportStatus status,
        Integer priorityScore,
        LocalDateTime slaDeadline,
        SlaStatus slaStatus,
        Long assignedTo,
        String assignedAdminName,
        Long targetUserId,
        String targetNickname,
        Long reporterId,
        String reporterNickname,
        LocalDateTime createdAt
) {
    public static AdminReportListItemResponse from(Report report, SlaStatus slaStatus) {
        AdminAccount assigned = report.getAssignedTo();
        return new AdminReportListItemResponse(
                report.getId(),
                report.getReason(),
                report.getStatus(),
                report.getPriorityScore(),
                report.getSlaDeadline(),
                slaStatus,
                assigned == null ? null : assigned.getId(),
                assigned == null ? null : assigned.getName(),
                report.getTargetUser().getId(),
                report.getTargetUser().getNickname(),
                report.getReporter().getId(),
                report.getReporter().getNickname(),
                report.getCreatedAt()
        );
    }
}
