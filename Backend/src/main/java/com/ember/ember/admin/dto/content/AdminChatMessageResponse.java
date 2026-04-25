package com.ember.ember.admin.dto.content;

import java.time.LocalDateTime;

/**
 * 관리자 채팅 메시지 조회 응답 DTO.
 */
public record AdminChatMessageResponse(
        Long messageId,
        Long chatRoomId,
        Long senderId,
        String senderNickname,
        String content,
        String type,
        Long sequenceId,
        Boolean isFlagged,
        LocalDateTime createdAt
) {}
