package com.ember.ember.messaging.event;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * exchange.report.v1 메시지 페이로드
 * Spring → FastAPI AI 서버로 발행되는 교환일기 완주 리포트 분석 요청 이벤트.
 *
 * OutboxRelay가 outbox_events.payload를 역직렬화하여 AiMessagePublisher로 전달한다.
 *
 * @param messageId   UUID 고유 메시지 식별자 (멱등성 체크용)
 * @param version     메시지 스키마 버전 (항상 "v1")
 * @param reportId    exchange_reports PK
 * @param roomId      exchange_rooms PK
 * @param userAId     교환방 userA PK
 * @param userBId     교환방 userB PK
 * @param diariesA    userA가 작성한 교환일기 목록
 * @param diariesB    userB가 작성한 교환일기 목록
 * @param publishedAt 발행 시각 (ISO-8601 KST)
 * @param traceparent OpenTelemetry W3C 트레이스 헤더
 */
public record ExchangeReportRequestedEvent(
        @JsonProperty("messageId") String messageId,
        @JsonProperty("version") String version,
        @JsonProperty("reportId") Long reportId,
        @JsonProperty("roomId") Long roomId,
        @JsonProperty("userAId") Long userAId,
        @JsonProperty("userBId") Long userBId,
        @JsonProperty("diariesA") List<DiaryPayload> diariesA,
        @JsonProperty("diariesB") List<DiaryPayload> diariesB,
        @JsonProperty("publishedAt") String publishedAt,
        @JsonProperty("traceparent") String traceparent
) {

    /** 기본 버전 상수 */
    public static final String VERSION = "v1";

    /**
     * 교환일기 단건 페이로드
     *
     * @param diaryId 교환일기(exchange_diaries) PK
     * @param content 일기 본문 (최대 5000자)
     */
    public record DiaryPayload(
            @JsonProperty("diaryId") Long diaryId,
            @JsonProperty("content") String content
    ) {}
}
