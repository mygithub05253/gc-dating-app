package com.ember.ember.admin.dto.analytics;

import java.time.LocalDate;
import java.util.List;

/**
 * 사용자 퍼널 분석 응답 (이탈 분석용) -- 관리자 API v2.1 SS18.
 * signup -> profile -> first_diary -> first_match -> exchange -> couple 6단 퍼널.
 */
public record ChurnFunnelResponse(
    Period period,
    String cohort,
    List<FunnelStage> stages,
    long totalSignups,
    Double overallConversionRate,
    Meta meta
) {
    public record Period(LocalDate start, LocalDate end, String tz) {}

    public record FunnelStage(
        String name,
        long count,
        Double rate,
        Double dropoffRate
    ) {}

    public record Meta(boolean degraded, String source) {}
}
