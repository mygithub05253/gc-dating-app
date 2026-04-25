package com.ember.ember.admin.dto.withdrawal;

import java.time.LocalDate;
import java.util.List;

public record WithdrawalStatsResponse(
        long totalWithdrawals,
        long pendingDeletion,
        List<ReasonBreakdown> byReason,
        List<DailyTrend> dailyTrend
) {
    public record ReasonBreakdown(
            String reason,
            long count
    ) {
    }

    public record DailyTrend(
            LocalDate date,
            long count
    ) {
    }
}
