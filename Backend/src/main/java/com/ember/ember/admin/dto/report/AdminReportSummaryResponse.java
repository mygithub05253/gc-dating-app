package com.ember.ember.admin.dto.report;

/**
 * 관리자 신고 요약 통계 — 관리자 API v2.1 §5.2.
 */
public record AdminReportSummaryResponse(
        long pendingCount,
        long slaWarningCount,
        long slaExceededCount
) {}
