package com.ember.ember.messaging.idempotency.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 메시지 멱등성 처리 엔티티
 * Consumer가 메시지를 처리하기 전 이 테이블에 INSERT를 시도.
 * PK(message_id) 중복 시 예외 발생 → 중복 처리 차단.
 * 별도 조회 없이 PK 충돌로 멱등성 보장.
 */
@Entity
@Table(name = "processed_messages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProcessedMessage {

    /**
     * RabbitMQ 메시지의 고유 ID (messageId 헤더값, UUID)
     */
    @Id
    @Column(name = "message_id", length = 36)
    private String messageId;

    /**
     * 메시지를 처리한 Consumer 이름 (예: 'AiResultConsumer', 'DiaryAnalyzeConsumer')
     */
    @Column(name = "consumer_name", nullable = false, length = 100)
    private String consumerName;

    @Column(name = "processed_at", nullable = false)
    private LocalDateTime processedAt;

    public static ProcessedMessage of(String messageId, String consumerName) {
        ProcessedMessage msg = new ProcessedMessage();
        msg.messageId = messageId;
        msg.consumerName = consumerName;
        msg.processedAt = LocalDateTime.now();
        return msg;
    }
}
