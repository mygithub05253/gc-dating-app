package com.ember.ember.admin.dto.ai;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * AI A/B 테스트 결과 응답 — §8 AI 관리.
 * 현재 A/B 테스트 미활성화 상태이므로 빈 결과를 반환한다.
 */
@Schema(description = "AI A/B 테스트 결과 응답")
public record AiAbTestResultsResponse(
        @Schema(description = "A/B 테스트 활성 여부") boolean active,
        @Schema(description = "테스트 결과 목록 (미활성 시 빈 배열)") List<AbTestResult> results
) {
    public record AbTestResult(
            @Schema(description = "테스트 그룹명") String groupName,
            @Schema(description = "대상 사용자 수") long userCount,
            @Schema(description = "전환율 (%)") double conversionRate,
            @Schema(description = "평균 점수") double avgScore
    ) {}
}
