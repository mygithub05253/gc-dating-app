package com.ember.ember.admin.dto.analytics;

import java.util.List;

/**
 * 비활성 사용자 요약 응답 -- 관리자 API v2.1 SS18.
 * last_login_at 기반 비활성 기간 구간별 사용자 수를 집계한다.
 */
public record InactiveUsersSummaryResponse(
    long totalInactive,
    List<InactiveBucket> byInactiveDays,
    Double reactivationRate,
    Meta meta
) {
    public record InactiveBucket(
        String range,
        long count
    ) {}

    public record Meta(boolean degraded, String source) {}
}
