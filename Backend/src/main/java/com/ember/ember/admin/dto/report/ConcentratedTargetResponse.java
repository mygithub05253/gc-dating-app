package com.ember.ember.admin.dto.report;

/**
 * 차단 집중 대상 응답 — 특정 기간 내 N회 이상 차단받은 사용자.
 */
public record ConcentratedTargetResponse(
        Long userId,
        String nickname,
        long blockCount
) {}
