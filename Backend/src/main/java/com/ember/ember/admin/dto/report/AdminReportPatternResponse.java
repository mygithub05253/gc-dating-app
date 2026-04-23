package com.ember.ember.admin.dto.report;

import com.ember.ember.report.domain.Report;

import java.util.List;
import java.util.Map;

/**
 * 신고 패턴 분석 응답 — 관리자 API v2.1 §5.12.
 *
 * <p>기간 내 접수된 신고 전체에 대해 다음을 집계:
 * <ul>
 *   <li>사유별 분포</li>
 *   <li>콘텐츠 유형별 분포 (DIARY/EXCHANGE_DIARY/CHAT_MESSAGE/PROFILE)</li>
 *   <li>피신고자 상위 N명 (reportCount DESC) — 집중 타깃</li>
 *   <li>신고자 상위 N명 — 잦은 신고자 (허위 신고 반복자 §5.13 후보)</li>
 *   <li>평균 priorityScore, OVERDUE 비율</li>
 * </ul>
 */
public record AdminReportPatternResponse(
        int periodDays,
        long totalReports,
        Map<Report.ReportReason, Long> byReason,
        Map<Report.ContextType, Long> byContextType,
        List<UserReportCount> topTargets,
        List<UserReportCount> topReporters,
        double avgPriorityScore,
        long overdueCount,
        double overdueRate
) {
    public record UserReportCount(Long userId, String nickname, long count) {}
}
