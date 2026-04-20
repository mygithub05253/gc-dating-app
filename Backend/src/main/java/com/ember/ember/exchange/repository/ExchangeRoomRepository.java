package com.ember.ember.exchange.repository;

import com.ember.ember.exchange.domain.ExchangeRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * 교환일기 방 Repository
 */
public interface ExchangeRoomRepository extends JpaRepository<ExchangeRoom, Long> {

    /**
     * roomUuid로 교환방 조회 (모바일 클라이언트에서 UUID로 식별).
     *
     * @param roomUuid 교환방 UUID
     * @return ExchangeRoom Optional
     */
    Optional<ExchangeRoom> findByRoomUuid(UUID roomUuid);
}
