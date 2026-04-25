package com.ember.ember.admin.dto.notice;

import com.ember.ember.notification.domain.Notice;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * 공지사항 상태 변경 응답 — §11 공지사항 관리.
 */
@Schema(description = "공지사항 상태 변경 응답")
public record NoticeStatusResponse(
        @Schema(description = "공지사항 ID") Long noticeId,
        @Schema(description = "변경된 상태") Notice.NoticeStatus status,
        @Schema(description = "카테고리") Notice.NoticeCategory category,
        @Schema(description = "경고 메시지 (약관 공지 숨김 시)") String warningMessage,
        @Schema(description = "변경 시각") LocalDateTime updatedAt
) {}
