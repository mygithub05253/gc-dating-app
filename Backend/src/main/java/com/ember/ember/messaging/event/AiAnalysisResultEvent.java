package com.ember.ember.messaging.event;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * ai.result.v1 메시지 페이로드
 * FastAPI AI 서버 → Spring으로 수신되는 분석 결과 이벤트.
 *
 * 일기 분석(DIARY_ANALYSIS_*) 시:
 *   - diaryId, userId, result/error 사용
 *   - reportId, roomId, exchangeResult = null
 *
 * 교환일기 리포트(EXCHANGE_REPORT_*) 시:
 *   - reportId, roomId, exchangeResult 사용
 *   - diaryId, userId, result, error = null
 *
 * @param messageId         UUID 고유 메시지 식별자 (멱등성 체크용)
 * @param originalMessageId 원본 요청 messageId
 * @param version           메시지 스키마 버전 (항상 "v1")
 * @param type              결과 타입
 * @param diaryId           분석 대상 일기 PK (일기 분석 시에만)
 * @param userId            일기 작성자 PK (일기 분석 시에만)
 * @param reportId          교환일기 리포트 PK (리포트 처리 시에만)
 * @param roomId            교환방 PK (리포트 처리 시에만)
 * @param analyzedAt        분석 완료 시각 (ISO-8601 KST)
 * @param traceparent       OpenTelemetry W3C 트레이스 헤더
 * @param result            일기 분석 성공 시 결과 데이터
 * @param error             분석 실패 시 에러 정보
 * @param exchangeResult    교환일기 리포트 결과 (리포트 완료 시에만)
 * @param lifestyleResult   라이프스타일 분석 결과 (LIFESTYLE_ANALYSIS_COMPLETED 시에만) (M6)
 * @param vectorResult      사용자 벡터 생성 결과 (USER_VECTOR_GENERATED 시에만) (M6)
 */
public record AiAnalysisResultEvent(
        @JsonProperty("messageId") String messageId,
        @JsonProperty("originalMessageId") String originalMessageId,
        @JsonProperty("version") String version,
        @JsonProperty("type") AiAnalysisResultType type,
        @JsonProperty("diaryId") Long diaryId,
        @JsonProperty("userId") Long userId,
        @JsonProperty("reportId") Long reportId,
        @JsonProperty("roomId") Long roomId,
        @JsonProperty("analyzedAt") String analyzedAt,
        @JsonProperty("traceparent") String traceparent,
        @JsonProperty("result") Result result,
        @JsonProperty("error") Error error,
        @JsonProperty("exchangeResult") ExchangeResult exchangeResult,
        @JsonProperty("lifestyleResult") LifestyleResult lifestyleResult,
        @JsonProperty("vectorResult") VectorResult vectorResult
) {

    /**
     * 일기 분석 성공 결과
     *
     * @param summary  일기 요약 (50자 이내)
     * @param category 일기 카테고리 (DAILY|TRAVEL|FOOD|RELATIONSHIP|WORK)
     * @param tags     분석 태그 목록 (EMOTION/LIFESTYLE/RELATIONSHIP_STYLE/TONE)
     */
    public record Result(
            @JsonProperty("summary") String summary,
            @JsonProperty("category") String category,
            @JsonProperty("tags") List<Tag> tags
    ) {}

    /**
     * 분석 태그 단위
     *
     * @param type  태그 유형 (EMOTION|LIFESTYLE|RELATIONSHIP_STYLE|TONE)
     * @param label 태그 레이블 (예: "기쁨", "아침형", "배려심")
     * @param score 신뢰도 점수 (0.0 ~ 1.0)
     */
    public record Tag(
            @JsonProperty("type") String type,
            @JsonProperty("label") String label,
            @JsonProperty("score") double score
    ) {}

    /**
     * 분석 실패 에러 정보
     *
     * @param code   에러 코드 (예: "INFERENCE_TIMEOUT")
     * @param detail 에러 상세 메시지
     */
    public record Error(
            @JsonProperty("code") String code,
            @JsonProperty("detail") String detail
    ) {}

    /**
     * 교환일기 완주 리포트 결과 (EXCHANGE_REPORT_COMPLETED 시 사용)
     *
     * @param commonKeywords     두 사람의 공통 핵심 키워드 목록
     * @param emotionSimilarity  감정 표현 유사도 점수 (0.0 ~ 1.0, KoSimCSE 코사인 유사도)
     * @param lifestylePatterns  생활 패턴 키워드 목록 (예: "아침형", "야외활동")
     * @param writingTempA       userA 글쓰기 온도 (0.0 ~ 1.0, KcELECTRA tone 분석)
     * @param writingTempB       userB 글쓰기 온도 (0.0 ~ 1.0)
     * @param aiDescription      AI 생성 두 사람 관계 설명 (한국어, 자연어)
     */
    public record ExchangeResult(
            @JsonProperty("commonKeywords") List<String> commonKeywords,
            @JsonProperty("emotionSimilarity") double emotionSimilarity,
            @JsonProperty("lifestylePatterns") List<String> lifestylePatterns,
            @JsonProperty("writingTempA") double writingTempA,
            @JsonProperty("writingTempB") double writingTempB,
            @JsonProperty("aiDescription") String aiDescription
    ) {}

    /**
     * 라이프스타일 분석 결과 (LIFESTYLE_ANALYSIS_COMPLETED 시 사용) (M6)
     *
     * @param dominantPatterns  주요 라이프스타일 패턴 top 3~5 (예: "아침형", "야외활동")
     * @param emotionProfile    감정 비율 프로필 (positive/negative/neutral 합계 1.0)
     * @param keywords          라이프스타일 키워드 상세 목록 (type/label/score)
     * @param summary           한국어 설명 60자 이내
     */
    public record LifestyleResult(
            @JsonProperty("dominantPatterns") List<String> dominantPatterns,
            @JsonProperty("emotionProfile") EmotionProfile emotionProfile,
            @JsonProperty("keywords") List<Tag> keywords,
            @JsonProperty("summary") String summary
    ) {}

    /**
     * 감정 비율 프로필
     *
     * @param positive  긍정 감정 비율 (0.0 ~ 1.0)
     * @param negative  부정 감정 비율 (0.0 ~ 1.0)
     * @param neutral   중립 감정 비율 (0.0 ~ 1.0)
     */
    public record EmotionProfile(
            @JsonProperty("positive") double positive,
            @JsonProperty("negative") double negative,
            @JsonProperty("neutral") double neutral
    ) {}

    /**
     * 사용자 임베딩 벡터 생성 결과 (USER_VECTOR_GENERATED 시 사용) (M6)
     *
     * @param embeddingBase64  768차원 float16 벡터 (Base64 인코딩, 1536 bytes)
     * @param dimension        벡터 차원 수 (기본 768)
     * @param source           임베딩 소스 ("DIARY" | "IDEAL_KEYWORDS" | "MIXED")
     */
    public record VectorResult(
            @JsonProperty("embeddingBase64") String embeddingBase64,
            @JsonProperty("dimension") int dimension,
            @JsonProperty("source") String source
    ) {}
}
