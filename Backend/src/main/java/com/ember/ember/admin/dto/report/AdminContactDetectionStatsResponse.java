package com.ember.ember.admin.dto.report;

import com.ember.ember.report.domain.ContactDetection;

import java.util.Map;

/**
 * 외부 연락처 감지 패턴 분포 통계 — 프런트 위젯용.
 */
public record AdminContactDetectionStatsResponse(
        int periodDays,
        long totalCount,
        long pendingCount,
        long confirmedCount,
        long falsePositiveCount,
        Map<ContactDetection.PatternType, Long> byPatternType
) {}
