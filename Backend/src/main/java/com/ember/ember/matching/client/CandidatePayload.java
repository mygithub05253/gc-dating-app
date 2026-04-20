package com.ember.ember.matching.client;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * FastAPI 매칭 계산 요청 내 후보 사용자 1건 페이로드.
 * - embedding: float16 바이트를 Base64 인코딩한 문자열
 * - personalityKeywords: AI 분석으로 누적된 퍼스널리티 레이블 목록
 */
@Getter
@Builder
public class CandidatePayload {

    private Long userId;

    /** float16 벡터 Base64 인코딩 (nullable: 벡터 없는 후보는 null → FastAPI에서 스킵) */
    private String embedding;

    /** EMOTION/LIFESTYLE/RELATIONSHIP_STYLE/TONE 태그 label 목록 */
    private List<String> personalityKeywords;
}
