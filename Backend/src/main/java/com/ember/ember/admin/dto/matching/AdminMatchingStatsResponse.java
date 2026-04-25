package com.ember.ember.admin.dto.matching;

/**
 * 관리자 매칭 통계 응답 DTO — §7.
 */
public record AdminMatchingStatsResponse(
        long totalMatchCount,
        double matchRate,
        double avgMatchTimeHours,
        long activeExchangeRooms,
        long completedExchangeRooms
) {}
