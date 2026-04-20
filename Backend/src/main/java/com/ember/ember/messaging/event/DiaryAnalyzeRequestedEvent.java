package com.ember.ember.messaging.event;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * diary.analyze.v1 메시지 페이로드
 * Spring → FastAPI AI 서버로 발행되는 일기 분석 요청 이벤트.
 *
 * @param messageId   UUID 고유 메시지 식별자
 * @param version     메시지 스키마 버전 (항상 "v1")
 * @param diaryId     분석 대상 일기 PK
 * @param userId      일기 작성자 PK
 * @param content     일기 본문 (최대 5000자)
 * @param publishedAt 발행 시각 (ISO-8601 KST)
 * @param traceparent OpenTelemetry W3C 트레이스 헤더
 */
public record DiaryAnalyzeRequestedEvent(
        @JsonProperty("messageId") String messageId,
        @JsonProperty("version") String version,
        @JsonProperty("diaryId") Long diaryId,
        @JsonProperty("userId") Long userId,
        @JsonProperty("content") String content,
        @JsonProperty("publishedAt") String publishedAt,
        @JsonProperty("traceparent") String traceparent
) {
    /** 기본 버전 상수 */
    public static final String VERSION = "v1";
}
