package com.ember.ember.admin.dto.exchange;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 관리자 교환일기 방 상세 응답 DTO.
 */
public record AdminExchangeRoomDetailResponse(
        Long roomId,
        UUID roomUuid,
        Long userAId,
        String userANickname,
        Long userBId,
        String userBNickname,
        String status,
        Integer turnCount,
        Integer roundCount,
        Long currentTurnUserId,
        LocalDateTime deadlineAt,
        LocalDateTime nextStepDeadlineAt,
        Long matchingId,
        Long chatRoomId,
        LocalDateTime createdAt,
        List<ExchangeDiaryItem> diaries
) {
    public record ExchangeDiaryItem(
            Long diaryId,
            Long authorId,
            String authorNickname,
            String contentPreview,
            Integer turnNumber,
            LocalDateTime createdAt
    ) {}
}
