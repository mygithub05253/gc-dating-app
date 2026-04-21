package com.ember.ember.user.dto;

import com.ember.ember.exchange.domain.ExchangeRoom;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "교환일기 히스토리 응답")
public record ExchangeHistoryResponse(

        List<ExchangeHistoryItem> rooms,
        Long nextCursor,
        boolean hasMore
) {

    @Schema(description = "교환일기 히스토리 항목")
    public record ExchangeHistoryItem(
            String roomUuid,
            String partnerNickname,
            String status,
            int totalDiaryCount,
            LocalDateTime completedAt
    ) {
        public static ExchangeHistoryItem from(ExchangeRoom room, Long myUserId) {
            var partner = room.getPartner(myUserId);
            String nickname = (partner.getDeletedAt() != null) ? "탈퇴한 사용자" : partner.getNickname();
            return new ExchangeHistoryItem(
                    room.getRoomUuid().toString(),
                    nickname,
                    room.getStatus().name(),
                    room.getTurnCount(),
                    room.getModifiedAt()
            );
        }
    }

    public static ExchangeHistoryResponse of(List<ExchangeRoom> rooms, Long myUserId, int requestedSize) {
        List<ExchangeHistoryItem> items = rooms.stream()
                .map(r -> ExchangeHistoryItem.from(r, myUserId))
                .toList();

        boolean hasMore = items.size() >= requestedSize;
        Long nextCursor = hasMore && !rooms.isEmpty()
                ? rooms.get(rooms.size() - 1).getId()
                : null;

        return new ExchangeHistoryResponse(items, nextCursor, hasMore);
    }
}
