package com.ember.ember.messaging.event;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * user.vector.generate.v1 outbound 메시지 페이로드.
 * Spring → FastAPI로 발행되는 사용자 임베딩 벡터 생성 요청 이벤트.
 *
 * @param messageId   UUID 고유 메시지 식별자
 * @param version     메시지 스키마 버전 (항상 "v1")
 * @param userId      벡터 생성 대상 사용자 PK
 * @param source      임베딩 소스 ("DIARY" | "IDEAL_KEYWORDS" | "MIXED")
 * @param texts       임베딩 입력 텍스트 목록 (일기 본문 또는 이상형 키워드)
 * @param publishedAt 발행 시각 (ISO-8601 KST)
 * @param traceparent OpenTelemetry W3C 트레이스 헤더 (선택)
 */
public record UserVectorGenerateRequestedEvent(
        @JsonProperty("messageId") String messageId,
        @JsonProperty("version") String version,
        @JsonProperty("userId") Long userId,
        @JsonProperty("source") String source,
        @JsonProperty("texts") List<String> texts,
        @JsonProperty("publishedAt") String publishedAt,
        @JsonProperty("traceparent") String traceparent
) {}
