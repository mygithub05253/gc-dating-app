package com.ember.ember.admin.dto.member;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * 회원 활동 요약 — 관리자 API §3.9.
 * 활동일(activeDays)은 1차 구현에서 0 으로 반환하고 Phase B 에서 로그인 일 수 집계로 대체한다.
 */
@Schema(description = "회원 활동 요약")
public record AdminMemberActivitySummaryResponse(
        @Schema(description = "총 일기 수") long totalDiaries,
        @Schema(description = "총 매칭 수") long totalMatches,
        @Schema(description = "활동일 수 (추후 확장)") long activeDays,
        @Schema(description = "마지막 활동 시각 (lastLoginAt 기준)") LocalDateTime lastActiveAt
) {}
