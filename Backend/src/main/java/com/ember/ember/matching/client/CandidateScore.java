package com.ember.ember.matching.client;

import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * FastAPI가 반환하는 후보 1건의 점수 결과.
 */
@Getter
@NoArgsConstructor
public class CandidateScore {

    private Long userId;
    private double matchingScore;
    private ScoreBreakdown breakdown;

    @Getter
    @NoArgsConstructor
    public static class ScoreBreakdown {
        /** 이상형 키워드 Jaccard 유사도 */
        private double keywordOverlap;
        /** 코사인 유사도 (0~1 정규화) */
        private double cosineSimilarity;
    }
}
