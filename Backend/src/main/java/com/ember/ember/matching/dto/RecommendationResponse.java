package com.ember.ember.matching.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * GET /api/matching/recommendations 응답 DTO.
 *
 * source 필드:
 *   - FRESH: 방금 AI 서버에서 계산한 결과
 *   - STALE: AI 장애 시 캐시에서 폴백한 결과 (X-Degraded: true 헤더 동반)
 */
@Getter
@Builder
public class RecommendationResponse {

    /** 결과 생성 시각 (KST 기준 ISO-8601) */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime generatedAt;

    /** 결과 신선도: FRESH | STALE */
    private String source;

    /** 추천 항목 목록 (최대 10개, matchingScore 내림차순) */
    private List<RecommendationItem> items;
}
