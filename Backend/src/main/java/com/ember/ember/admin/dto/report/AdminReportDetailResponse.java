package com.ember.ember.admin.dto.report;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.report.domain.Report;
import com.ember.ember.report.service.ReportPriorityCalculator.SlaStatus;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 관리자 신고 상세 응답 — 관리자 API v2.1 §5.3 응답 필드.
 */
public record AdminReportDetailResponse(
        Long id,
        Long reporterId,
        String reporterNickname,
        Long targetId,
        String targetNickname,
        Report.ReportReason reason,
        Report.ContextType contextType,
        Long contextId,
        String detail,
        Report.ReportStatus status,
        Integer priorityScore,
        LocalDateTime slaDeadline,
        SlaStatus slaStatus,
        Long assignedTo,
        String assignedAdminName,
        LocalDateTime createdAt,
        LocalDateTime resolvedAt,
        String resolvedByName,
        String resolveNote,
        List<PreviousReport> targetPreviousReports
) {
    public record PreviousReport(
            Long id,
            Report.ReportReason reason,
            Report.ReportStatus status,
            LocalDateTime createdAt
    ) {
        public static PreviousReport from(Report r) {
            return new PreviousReport(r.getId(), r.getReason(), r.getStatus(), r.getCreatedAt());
        }
    }

    public static AdminReportDetailResponse from(Report report,
                                                  SlaStatus slaStatus,
                                                  List<Report> previousOfTarget) {
        AdminAccount assigned = report.getAssignedTo();
        AdminAccount resolver = report.getResolvedBy();
        return new AdminReportDetailResponse(
                report.getId(),
                report.getReporter().getId(),
                report.getReporter().getNickname(),
                report.getTargetUser().getId(),
                report.getTargetUser().getNickname(),
                report.getReason(),
                report.getContextType(),
                report.getContextId(),
                report.getDetail(),
                report.getStatus(),
                report.getPriorityScore(),
                report.getSlaDeadline(),
                slaStatus,
                assigned == null ? null : assigned.getId(),
                assigned == null ? null : assigned.getName(),
                report.getCreatedAt(),
                report.getResolvedAt(),
                resolver == null ? null : resolver.getName(),
                report.getResolveNote(),
                previousOfTarget.stream().map(PreviousReport::from).toList()
        );
    }
}
