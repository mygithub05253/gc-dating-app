package com.ember.ember.messaging.outbox.repository;

import com.ember.ember.messaging.outbox.entity.OutboxEvent;
import com.ember.ember.messaging.outbox.entity.OutboxEvent.OutboxStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 아웃박스 이벤트 Repository
 * OutboxRelay가 PENDING 이벤트를 배치 조회하여 RabbitMQ로 발행.
 */
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {

    /**
     * 다중 인스턴스 환경에서 중복 발행 방지를 위해 SKIP LOCKED 적용.
     * 한 인스턴스가 처리 중인 행은 다른 인스턴스가 건너뜀.
     *
     * @param status 조회할 상태 (PENDING)
     * @return 최대 100건의 이벤트 목록 (created_at 오름차순)
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(value = """
            SELECT e FROM OutboxEvent e
            WHERE e.status = :status
            ORDER BY e.createdAt ASC
            LIMIT 100
            """)
    List<OutboxEvent> findTop100ByStatusOrderByCreatedAt(@Param("status") OutboxStatus status);

    /**
     * 가장 오래된 PENDING 이벤트의 createdAt을 조회.
     * OutboxRelayLag 게이지에서 지연 시간 계산에 사용.
     *
     * @param status 조회할 상태 (PENDING)
     * @return 가장 오래된 PENDING 이벤트의 createdAt (없으면 Optional.empty())
     */
    @Query("SELECT MIN(e.createdAt) FROM OutboxEvent e WHERE e.status = :status")
    Optional<LocalDateTime> findOldestCreatedAtByStatus(@Param("status") OutboxStatus status);
}
