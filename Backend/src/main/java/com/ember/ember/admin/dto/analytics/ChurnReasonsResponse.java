package com.ember.ember.admin.dto.analytics;

import java.util.List;

/**
 * 이탈 사유 분석 응답 -- 관리자 API v2.1 SS18.
 * 이탈 사용자의 마지막 활동 패턴을 기반으로 추정 이탈 사유를 집계한다.
 */
public record ChurnReasonsResponse(
    List<ReasonItem> reasons,
    long totalAnalyzed,
    Meta meta
) {
    public record ReasonItem(
        String reason,
        long count,
        Double percentage
    ) {}

    public record Meta(boolean degraded, String source) {}
}
