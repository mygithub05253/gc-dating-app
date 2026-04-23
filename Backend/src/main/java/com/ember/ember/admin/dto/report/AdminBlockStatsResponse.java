package com.ember.ember.admin.dto.report;

import java.util.List;

/**
 * 차단 통계 / 차단 집중 대상 응답 — 관리자 API v2.1 §5.9.
 */
public record AdminBlockStatsResponse(
        long totalActive,
        long totalUnblocked,
        long totalAdminCancelled,
        List<ConcentratedTarget> concentratedTargets
) {
    public record ConcentratedTarget(
            Long userId,
            String nickname,
            long blockCount
    ) {}
}
