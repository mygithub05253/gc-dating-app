package com.ember.ember.messaging.event;

/**
 * AI 분석 결과 메시지 타입
 * ai.result.v1 메시지의 type 필드 값.
 *
 * DIARY_ANALYSIS_COMPLETED      : 일기 개별 분석 완료 (M2)
 * DIARY_ANALYSIS_FAILED         : 일기 개별 분석 실패 (M2)
 * EXCHANGE_REPORT_COMPLETED     : 교환일기 완주 리포트 생성 완료 (M5)
 * EXCHANGE_REPORT_FAILED        : 교환일기 완주 리포트 생성 실패 (M5)
 * LIFESTYLE_ANALYSIS_COMPLETED  : 라이프스타일 분석 완료 (M6)
 * LIFESTYLE_ANALYSIS_FAILED     : 라이프스타일 분석 실패 (M6)
 * USER_VECTOR_GENERATED         : 사용자 임베딩 벡터 생성 완료 (M6)
 * USER_VECTOR_FAILED            : 사용자 임베딩 벡터 생성 실패 (M6)
 */
public enum AiAnalysisResultType {
    DIARY_ANALYSIS_COMPLETED,
    DIARY_ANALYSIS_FAILED,
    EXCHANGE_REPORT_COMPLETED,
    EXCHANGE_REPORT_FAILED,
    LIFESTYLE_ANALYSIS_COMPLETED,
    LIFESTYLE_ANALYSIS_FAILED,
    USER_VECTOR_GENERATED,
    USER_VECTOR_FAILED
}
