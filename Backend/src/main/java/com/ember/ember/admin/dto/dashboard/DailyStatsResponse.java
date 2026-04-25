package com.ember.ember.admin.dto.dashboard;

import java.time.LocalDate;

/**
 * 일별 통계 응답 DTO.
 */
public record DailyStatsResponse(
    LocalDate date,
    long newUsers,
    long activeUsers,
    long matches,
    long diaries
) {}
