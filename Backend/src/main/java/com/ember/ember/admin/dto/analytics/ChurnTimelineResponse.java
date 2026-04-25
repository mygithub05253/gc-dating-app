package com.ember.ember.admin.dto.analytics;

import java.time.LocalDate;
import java.util.List;

/**
 * 이탈 타임라인 응답 -- 관리자 API v2.1 SS18.
 * 최근 로그인 간격이 30일 초과인 사용자를 이탈로 간주하고
 * 일별/주별 이탈 추이를 반환한다.
 */
public record ChurnTimelineResponse(
    Period period,
    String granularity,
    List<TimelinePoint> timeline,
    long totalChurned,
    Double averageChurnRate,
    Meta meta
) {
    public record Period(LocalDate start, LocalDate end, String tz) {}

    public record TimelinePoint(
        LocalDate date,
        long churnCount,
        Double churnRate
    ) {}

    public record Meta(boolean degraded, String source) {}
}
