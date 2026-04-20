package com.ember.ember.matching.client;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * Spring → FastAPI POST /api/matching/calculate 요청 바디.
 *
 * 설계 원칙:
 *   - FastAPI는 DB 직접 쓰기 금지 (설계서 9.3§).
 *   - 임베딩은 Spring이 조회해 Base64로 전달.
 *   - 키워드 텍스트(label)로 Jaccard 계산, 임베딩으로 코사인 계산.
 */
@Getter
@Builder
public class MatchingCalculateRequest {

    /** 기준 사용자 ID */
    private Long userId;

    /**
     * 기준 사용자의 float16 임베딩 Base64 인코딩.
     * null이면 FastAPI가 idealKeywords를 join → KoSimCSE 임베딩 동적 생성.
     */
    private String userEmbedding;

    /**
     * 기준 사용자의 이상형 키워드 텍스트 목록.
     * Jaccard 분모 + 기준 사용자 임베딩 없을 때 대체 임베딩 소스로 사용.
     */
    private List<String> idealKeywords;

    /**
     * 후보 사용자 목록 (최대 50명).
     * 각 후보의 임베딩 + 퍼스널리티 키워드 포함.
     */
    private List<CandidatePayload> candidates;
}
