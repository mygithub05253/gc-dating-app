package com.ember.ember.notification.dto;

import com.ember.ember.notification.domain.Notice;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "공지사항 응답")
public record NoticeResponse(
        Long id,
        String title,
        String category,
        String priority,
        boolean isPinned,
        LocalDateTime publishedAt
) {
    public static NoticeResponse from(Notice notice) {
        return new NoticeResponse(
                notice.getId(), notice.getTitle(),
                notice.getCategory().name(), notice.getPriority().name(),
                notice.getIsPinned(), notice.getPublishedAt()
        );
    }
}
