package com.ember.ember.admin.dto.ai;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * AI 재분석 트리거 응답 — §8 AI 관리.
 */
@Schema(description = "AI 재분석 트리거 응답")
public record AiReanalyzeResponse(
        @Schema(description = "일기 ID") Long diaryId,
        @Schema(description = "분석 상태 (PENDING)") String status
) {}
