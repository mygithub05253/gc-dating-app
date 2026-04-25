package com.ember.ember.admin.dto.dashboard;

import java.util.List;

/**
 * 매칭 통계 응답 DTO.
 */
public record MatchingStatsResponse(
    long totalMatches,
    double successRate,
    double averageMatchTimeHours,
    List<KeywordCount> topKeywords
) {
    public record KeywordCount(String keyword, long count) {}
}
