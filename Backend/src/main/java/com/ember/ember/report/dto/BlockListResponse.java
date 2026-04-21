package com.ember.ember.report.dto;

import com.ember.ember.report.domain.Block;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "차단 목록 조회 응답")
public record BlockListResponse(

        @Schema(description = "차단된 사용자 목록")
        List<BlockItem> blocks,

        @Schema(description = "다음 페이지 커서 (마지막이면 null)")
        Long nextCursor,

        @Schema(description = "다음 페이지 존재 여부")
        boolean hasMore
) {

    @Schema(description = "차단된 사용자 정보")
    public record BlockItem(
            @Schema(description = "차단 기록 ID")
            Long blockId,

            @Schema(description = "차단된 사용자 ID")
            Long userId,

            @Schema(description = "차단된 사용자 닉네임")
            String nickname,

            @Schema(description = "차단 일시")
            LocalDateTime blockedAt
    ) {
        public static BlockItem from(Block block) {
            return new BlockItem(
                    block.getId(),
                    block.getBlockedUser().getId(),
                    block.getBlockedUser().getNickname(),
                    block.getCreatedAt()
            );
        }
    }

    public static BlockListResponse of(List<Block> blocks, int requestedSize) {
        List<BlockItem> items = blocks.stream()
                .map(BlockItem::from)
                .toList();

        boolean hasMore = items.size() >= requestedSize;
        Long nextCursor = hasMore && !items.isEmpty()
                ? items.get(items.size() - 1).blockId()
                : null;

        return new BlockListResponse(items, nextCursor, hasMore);
    }
}
