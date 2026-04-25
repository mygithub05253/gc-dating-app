package com.ember.ember.admin.dto.analytics;

import java.util.List;

/**
 * 이탈 위험 사용자 수 응답 -- 관리자 API v2.1 SS18.
 * HIGH=14일 이상 미접속, MEDIUM=7~14일, LOW=3~7일.
 */
public record ChurnAtRiskResponse(
    long atRiskCount,
    List<RiskLevelCount> byRiskLevel,
    Meta meta
) {
    public record RiskLevelCount(
        String level,
        long count
    ) {}

    public record Meta(boolean degraded, String source) {}
}
