package com.ember.ember.messaging.idempotency.repository;

import com.ember.ember.messaging.idempotency.entity.ProcessedMessage;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 메시지 멱등성 Repository
 * Consumer 측에서 메시지 처리 전 save()를 시도.
 * message_id(PK) 중복 시 DataIntegrityViolationException 발생 → 중복 처리 차단.
 * 별도 조회 쿼리 불필요 — PK 충돌로 멱등성 보장.
 */
public interface ProcessedMessageRepository extends JpaRepository<ProcessedMessage, String> {
}
