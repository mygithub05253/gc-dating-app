package com.ember.ember.aireport.repository;

import com.ember.ember.aireport.domain.ExchangeReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * 교환일기 리포트 Repository
 */
public interface ExchangeReportRepository extends JpaRepository<ExchangeReport, Long> {

    /**
     * roomId로 리포트 존재 여부 확인 (중복 생성 방지).
     * ExchangeReport.room은 ExchangeRoom(FK: room_id, unique)이므로 단건 보장.
     *
     * @param roomId exchange_rooms PK
     * @return 리포트가 이미 존재하면 true
     */
    boolean existsByRoomId(Long roomId);

    /**
     * roomId로 리포트 단건 조회.
     *
     * @param roomId exchange_rooms PK
     * @return ExchangeReport Optional
     */
    Optional<ExchangeReport> findByRoomId(Long roomId);
}
