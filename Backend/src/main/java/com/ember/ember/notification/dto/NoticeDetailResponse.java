package com.ember.ember.notification.dto;

import com.ember.ember.notification.domain.Notice;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "공지사항 상세 응답")
public record NoticeDetailResponse(
        Long id,
        String title,
        String content,
        String category,
        String priority,
        boolean isPinned,
        LocalDateTime publishedAt,
        int viewCount
) {
    public static NoticeDetailResponse from(Notice notice) {
        return new NoticeDetailResponse(
                notice.getId(), notice.getTitle(), notice.getContent(),
                notice.getCategory().name(), notice.getPriority().name(),
                notice.getIsPinned(), notice.getPublishedAt(), notice.getViewCount()
        );
    }
}
