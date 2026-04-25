package com.ember.ember.admin.dto.ai;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * AI 파이프라인 메트릭 응답 — §8 AI 관리.
 */
@Schema(description = "AI 파이프라인 메트릭 응답")
public record AiPipelineMetricsResponse(
        @Schema(description = "전체 분석 완료 건수") long totalAnalyzed,
        @Schema(description = "분석 실패 건수") long totalFailed,
        @Schema(description = "분석 대기 건수") long totalPending,
        @Schema(description = "분석 중 건수") long totalProcessing,
        @Schema(description = "분석 건너뜀 건수") long totalSkipped,
        @Schema(description = "Outbox PENDING 건수") long outboxPending,
        @Schema(description = "Outbox FAILED 건수") long outboxFailed,
        @Schema(description = "성공률 (%)") double successRate
) {}
