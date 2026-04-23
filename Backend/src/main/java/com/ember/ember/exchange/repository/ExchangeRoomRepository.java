package com.ember.ember.exchange.repository;

import com.ember.ember.exchange.domain.ExchangeRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * 교환일기 방 Repository
 */
public interface ExchangeRoomRepository extends JpaRepository<ExchangeRoom, Long> {

    /** roomUuid로 교환방 조회 */
    Optional<ExchangeRoom> findByRoomUuid(UUID roomUuid);

    /** 참여 중인 교환방 목록 (최신순) */
    @Query("SELECT r FROM ExchangeRoom r WHERE (r.userA.id = :userId OR r.userB.id = :userId) " +
           "AND r.status NOT IN ('TERMINATED', 'ENDED') ORDER BY r.modifiedAt DESC")
    List<ExchangeRoom> findByParticipant(@Param("userId") Long userId);

    /** 만료 대상 교환방 조회 (배치 스케줄러용, 5초 버퍼) */
    @Query("SELECT r FROM ExchangeRoom r WHERE r.status = 'ACTIVE' " +
           "AND r.deadlineAt < :cutoff")
    List<ExchangeRoom> findExpiredRooms(@Param("cutoff") java.time.LocalDateTime cutoff);

    /** 히스토리 조회 (완료/만료/종료된 방, 커서 기반 페이징) */
    @Query("""
            SELECT r FROM ExchangeRoom r
            JOIN FETCH r.userA JOIN FETCH r.userB
            WHERE (r.userA.id = :userId OR r.userB.id = :userId)
              AND r.status IN ('COMPLETED', 'EXPIRED', 'TERMINATED', 'ARCHIVED', 'ENDED')
              AND (:cursor IS NULL OR r.id < :cursor)
            ORDER BY r.modifiedAt DESC
            LIMIT :size
            """)
    List<ExchangeRoom> findHistoryByParticipant(
            @Param("userId") Long userId, @Param("cursor") Long cursor, @Param("size") int size);

    // ── 관리자 집계용 (A-4 교환일기 흐름 통계) ─────────────────────────────
    /** 기간 내 생성된 방 전체 상태 집계 — status 별 카운트용 스트림 조회. */
    @Query("""
            SELECT r.status, COUNT(r)
            FROM ExchangeRoom r
            WHERE r.createdAt >= :from AND r.createdAt < :to
            GROUP BY r.status
            """)
    List<Object[]> aggregateStatusBetween(
            @Param("from") java.time.LocalDateTime from,
            @Param("to") java.time.LocalDateTime to);
}
