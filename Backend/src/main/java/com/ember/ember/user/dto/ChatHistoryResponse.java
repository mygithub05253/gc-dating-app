package com.ember.ember.user.dto;

import com.ember.ember.chat.domain.ChatRoom;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "채팅 히스토리 응답")
public record ChatHistoryResponse(

        List<ChatHistoryItem> chatRooms,
        Long nextCursor,
        boolean hasMore
) {

    @Schema(description = "채팅 히스토리 항목")
    public record ChatHistoryItem(
            Long chatRoomId,
            String partnerNickname,
            String status,
            LocalDateTime endedAt
    ) {
        public static ChatHistoryItem from(ChatRoom room, Long myUserId) {
            var partner = room.getPartner(myUserId);
            String nickname = (partner.getDeletedAt() != null) ? "탈퇴한 사용자" : partner.getNickname();
            return new ChatHistoryItem(
                    room.getId(),
                    nickname,
                    room.getStatus().name(),
                    room.getModifiedAt()
            );
        }
    }

    public static ChatHistoryResponse of(List<ChatRoom> rooms, Long myUserId, int requestedSize) {
        List<ChatHistoryItem> items = rooms.stream()
                .map(r -> ChatHistoryItem.from(r, myUserId))
                .toList();

        boolean hasMore = items.size() >= requestedSize;
        Long nextCursor = hasMore && !rooms.isEmpty()
                ? rooms.get(rooms.size() - 1).getId()
                : null;

        return new ChatHistoryResponse(items, nextCursor, hasMore);
    }
}
