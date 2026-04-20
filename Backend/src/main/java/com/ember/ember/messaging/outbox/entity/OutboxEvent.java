package com.ember.ember.messaging.outbox.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 아웃박스 패턴 이벤트 엔티티
 * 트랜잭션 내에서 DB와 메시지 발행을 원자적으로 처리하기 위해 사용.
 * OutboxRelay 스케줄러가 0.5초 간격으로 PENDING 이벤트를 RabbitMQ로 릴레이.
 */
@Entity
@Table(
    name = "outbox_events",
    indexes = {
        // Relay 폴링용: PENDING 상태를 생성 순서대로 조회
        @Index(name = "idx_outbox_events_status_created_at", columnList = "status, created_at")
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OutboxEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 이벤트 발생 도메인 (예: 'DIARY', 'EXCHANGE_REPORT')
     */
    @Column(name = "aggregate_type", nullable = false, length = 50)
    private String aggregateType;

    /**
     * 해당 도메인의 엔티티 PK
     */
    @Column(name = "aggregate_id", nullable = false)
    private Long aggregateId;

    /**
     * 이벤트 종류 (예: 'DIARY_ANALYZE_REQUESTED', 'EXCHANGE_REPORT_REQUESTED')
     */
    @Column(name = "event_type", nullable = false, length = 80)
    private String eventType;

    /**
     * RabbitMQ 메시지 본문 (JSON)
     */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String payload;

    /**
     * 트레이싱 헤더 (traceparent 등, JSON)
     */
    @Column(columnDefinition = "TEXT")
    private String headers;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private OutboxStatus status = OutboxStatus.PENDING;

    /**
     * 발행 재시도 횟수 (최대 5회 초과 시 FAILED 처리)
     */
    @Column(name = "retry_count", nullable = false)
    private int retryCount = 0;

    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @PrePersist
    protected void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    public enum OutboxStatus {
        PENDING, PROCESSED, FAILED
    }

    public static OutboxEvent of(String aggregateType, Long aggregateId, String eventType, String payload) {
        OutboxEvent event = new OutboxEvent();
        event.aggregateType = aggregateType;
        event.aggregateId = aggregateId;
        event.eventType = eventType;
        event.payload = payload;
        return event;
    }

    public static OutboxEvent of(String aggregateType, Long aggregateId, String eventType, String payload, String headers) {
        OutboxEvent event = of(aggregateType, aggregateId, eventType, payload);
        event.headers = headers;
        return event;
    }

    // 발행 성공 처리
    public void markProcessed() {
        this.status = OutboxStatus.PROCESSED;
        this.processedAt = LocalDateTime.now();
    }

    // 재시도 증가 및 최대 실패 처리 (5회 초과 시 FAILED)
    public void incrementRetryOrFail(int maxRetry) {
        this.retryCount++;
        if (this.retryCount >= maxRetry) {
            this.status = OutboxStatus.FAILED;
        }
    }
}
