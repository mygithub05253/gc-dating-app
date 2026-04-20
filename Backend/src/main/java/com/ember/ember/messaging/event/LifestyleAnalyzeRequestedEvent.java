package com.ember.ember.messaging.event;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * lifestyle.analyze.v1 outbound 메시지 페이로드.
 * Spring → FastAPI로 발행되는 라이프스타일 분석 요청 이벤트.
 *
 * @param messageId   UUID 고유 메시지 식별자
 * @param version     메시지 스키마 버전 (항상 "v1")
 * @param userId      분석 대상 사용자 PK
 * @param diaries     분석에 사용할 최근 일기 목록 (최대 10편)
 * @param publishedAt 발행 시각 (ISO-8601 KST)
 * @param traceparent OpenTelemetry W3C 트레이스 헤더 (선택)
 */
public record LifestyleAnalyzeRequestedEvent(
        @JsonProperty("messageId") String messageId,
        @JsonProperty("version") String version,
        @JsonProperty("userId") Long userId,
        @JsonProperty("diaries") List<DiaryPayload> diaries,
        @JsonProperty("publishedAt") String publishedAt,
        @JsonProperty("traceparent") String traceparent
) {

    /**
     * 일기 1편 페이로드 (라이프스타일 분석용).
     *
     * @param diaryId   일기 PK
     * @param content   일기 본문
     * @param createdAt 작성 일시 (ISO-8601 KST)
     */
    public record DiaryPayload(
            @JsonProperty("diaryId") Long diaryId,
            @JsonProperty("content") String content,
            @JsonProperty("createdAt") String createdAt
    ) {}
}
