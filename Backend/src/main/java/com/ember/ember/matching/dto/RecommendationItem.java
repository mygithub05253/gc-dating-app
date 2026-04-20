package com.ember.ember.matching.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

/**
 * 추천 결과 개별 항목 DTO.
 * FastAPI로부터 받은 점수 + breakdown을 담아 클라이언트에 반환한다.
 */
@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecommendationItem {

    /** 추천 대상 사용자 PK */
    private Long userId;

    /** 최종 매칭 점수 (0.0 ~ 1.0) */
    private double matchingScore;

    /** 점수 세부 내역 */
    private ScoreBreakdown breakdown;

    /** 일기 분석 기반 요약 (추후 활용, nullable) */
    private String summary;

    /**
     * 점수 세부 내역 (Jaccard + 코사인 유사도).
     */
    @Getter
    @Builder
    public static class ScoreBreakdown {
        /** 이상형 키워드 Jaccard 유사도 (0.0 ~ 1.0) */
        private double keywordOverlap;
        /** KoSimCSE 코사인 유사도 정규화값 (0.0 ~ 1.0) */
        private double cosineSimilarity;
    }
}
