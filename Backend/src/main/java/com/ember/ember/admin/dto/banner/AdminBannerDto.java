package com.ember.ember.admin.dto.banner;

import com.ember.ember.notification.domain.Banner;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/**
 * 관리자 배너 DTO 모음 (명세 v2.1 §12).
 */
public final class AdminBannerDto {

    private AdminBannerDto() {}

    // ── 요청 DTO ──────────────────────────────────────────────

    public record CreateRequest(
            @NotBlank @Size(max = 100) String title,
            @NotBlank @Size(max = 500) String imageUrl,
            @NotNull Banner.LinkType linkType,
            @Size(max = 500) String linkUrl,
            Integer priority,
            Boolean isActive,
            @NotNull LocalDateTime startAt,
            @NotNull LocalDateTime endAt
    ) {}

    public record UpdateRequest(
            @NotBlank @Size(max = 100) String title,
            @NotBlank @Size(max = 500) String imageUrl,
            @NotNull Banner.LinkType linkType,
            @Size(max = 500) String linkUrl,
            Integer priority,
            Boolean isActive,
            @NotNull LocalDateTime startAt,
            @NotNull LocalDateTime endAt
    ) {}

    // ── 응답 DTO ──────────────────────────────────────────────

    public record BannerResponse(
            Long id,
            String title,
            String imageUrl,
            Banner.LinkType linkType,
            String linkUrl,
            Integer priority,
            Boolean isActive,
            LocalDateTime startAt,
            LocalDateTime endAt,
            LocalDateTime createdAt,
            LocalDateTime modifiedAt
    ) {
        public static BannerResponse from(Banner b) {
            return new BannerResponse(
                    b.getId(),
                    b.getTitle(),
                    b.getImageUrl(),
                    b.getLinkType(),
                    b.getLinkUrl(),
                    b.getPriority(),
                    b.getIsActive(),
                    b.getStartAt(),
                    b.getEndAt(),
                    b.getCreatedAt(),
                    b.getModifiedAt()
            );
        }
    }
}
