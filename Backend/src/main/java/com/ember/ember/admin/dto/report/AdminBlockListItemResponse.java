package com.ember.ember.admin.dto.report;

import com.ember.ember.report.domain.Block;

import java.time.LocalDateTime;

/**
 * 관리자 차단 이력 목록 아이템 — 관리자 API v2.1 §5.8.
 */
public record AdminBlockListItemResponse(
        Long id,
        Long blockerUserId,
        String blockerNickname,
        Long blockedUserId,
        String blockedNickname,
        Block.BlockStatus status,
        LocalDateTime createdAt
) {
    public static AdminBlockListItemResponse from(Block block) {
        return new AdminBlockListItemResponse(
                block.getId(),
                block.getBlockerUser().getId(),
                block.getBlockerUser().getNickname(),
                block.getBlockedUser().getId(),
                block.getBlockedUser().getNickname(),
                block.getStatus(),
                block.getCreatedAt()
        );
    }
}
