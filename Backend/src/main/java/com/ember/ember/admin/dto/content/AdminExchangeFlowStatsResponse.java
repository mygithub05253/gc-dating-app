package com.ember.ember.admin.dto.content;

import java.util.List;

/**
 * 교환일기 흐름 통계 (관리자 대시보드용).
 * 계획서 A-4 `교환일기 작성 흐름 시각화` 에 대응.
 * <p>
 * 각 단계(Matching → Room Active → Completion)에서의 진입/이탈/체류시간을
 * 집계해 깔때기 시각화용으로 제공한다.
 */
public record AdminExchangeFlowStatsResponse(
        int periodDays,
        long matchingStartedCount,
        long roomActiveCount,
        long completedCount,
        long terminatedCount,
        double completionRate,
        double avgTurnsToComplete,
        List<StepFunnel> funnel
) {
    public record StepFunnel(
            String stepName,
            long enteredCount,
            long exitedCount,
            double retentionRate
    ) {}
}
