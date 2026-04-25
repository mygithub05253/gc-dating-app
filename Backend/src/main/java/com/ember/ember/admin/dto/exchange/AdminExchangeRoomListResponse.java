package com.ember.ember.admin.dto.exchange;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 관리자 교환일기 방 목록 응답 DTO.
 */
public record AdminExchangeRoomListResponse(
        Long roomId,
        UUID roomUuid,
        Long userAId,
        String userANickname,
        Long userBId,
        String userBNickname,
        String status,
        Integer turnCount,
        Integer roundCount,
        LocalDateTime deadlineAt,
        LocalDateTime createdAt
) {}
