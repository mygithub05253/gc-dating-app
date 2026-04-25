package com.ember.ember.admin.dto.notice;

import com.ember.ember.notification.domain.Notice;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/**
 * 관리자 공지사항 DTO 모음 (명세 v2.1 §11).
 */
public final class AdminNoticeDto {

    private AdminNoticeDto() {}

    // ── 요청 DTO ──────────────────────────────────────────────

    public record CreateRequest(
            @NotBlank @Size(max = 200) String title,
            @NotBlank String content,
            @NotNull Notice.NoticeCategory category,
            Notice.NoticeStatus status,
            Notice.NoticePriority priority,
            Boolean isPinned,
            Notice.TargetAudience targetAudience,
            LocalDateTime publishedAt
    ) {}

    public record UpdateRequest(
            @NotBlank @Size(max = 200) String title,
            @NotBlank String content,
            @NotNull Notice.NoticeCategory category,
            Notice.NoticeStatus status,
            Notice.NoticePriority priority,
            Boolean isPinned,
            Notice.TargetAudience targetAudience,
            LocalDateTime publishedAt
    ) {}

    // ── 응답 DTO ──────────────────────────────────────────────

    public record NoticeResponse(
            Long id,
            String title,
            String content,
            Notice.NoticeCategory category,
            Notice.NoticeStatus status,
            Notice.NoticePriority priority,
            Boolean isPinned,
            Notice.TargetAudience targetAudience,
            LocalDateTime publishedAt,
            Integer viewCount,
            Long adminId,
            LocalDateTime createdAt,
            LocalDateTime modifiedAt
    ) {
        public static NoticeResponse from(Notice n) {
            return new NoticeResponse(
                    n.getId(),
                    n.getTitle(),
                    n.getContent(),
                    n.getCategory(),
                    n.getStatus(),
                    n.getPriority(),
                    n.getIsPinned(),
                    n.getTargetAudience(),
                    n.getPublishedAt(),
                    n.getViewCount(),
                    n.getAdmin() != null ? n.getAdmin().getId() : null,
                    n.getCreatedAt(),
                    n.getModifiedAt()
            );
        }
    }
}
