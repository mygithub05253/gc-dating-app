package com.ember.ember.matching.client;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * FastAPI POST /api/matching/calculate 응답 바디.
 */
@Getter
@NoArgsConstructor
public class MatchingCalculateResponse {

    /** 후보별 점수 결과 목록 (FastAPI가 내림차순 정렬해서 반환) */
    private List<CandidateScore> scores;
}
