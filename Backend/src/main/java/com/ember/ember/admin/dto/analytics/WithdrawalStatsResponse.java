package com.ember.ember.admin.dto.analytics;

import java.time.LocalDate;
import java.util.List;

/**
 * 탈퇴 통계 응답 -- 관리자 API v2.1 SS18.
 * user_withdrawal_log 테이블 기반 탈퇴 통계를 집계한다.
 */
public record WithdrawalStatsResponse(
    Period period,
    long totalWithdrawals,
    long pendingDeletion,
    List<ReasonCount> byReason,
    List<DailyTrend> dailyTrend,
    Meta meta
) {
    public record Period(LocalDate start, LocalDate end, String tz) {}

    public record ReasonCount(
        String reason,
        long count,
        Double percentage
    ) {}

    public record DailyTrend(
        LocalDate date,
        long count
    ) {}

    public record Meta(boolean degraded, String source) {}
}
