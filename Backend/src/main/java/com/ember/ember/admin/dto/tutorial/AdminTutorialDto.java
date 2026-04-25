package com.ember.ember.admin.dto.tutorial;

import com.ember.ember.notification.domain.TutorialPage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 관리자 튜토리얼 DTO 모음 (명세 v2.1 §23).
 */
public final class AdminTutorialDto {

    private AdminTutorialDto() {}

    // ── 요청 DTO ──────────────────────────────────────────────

    public record CreateRequest(
            @NotBlank @Size(max = 100) String title,
            @NotBlank String body,
            @Size(max = 500) String imageUrl,
            Integer pageOrder,
            Boolean isActive
    ) {}

    public record UpdateRequest(
            @NotBlank @Size(max = 100) String title,
            @NotBlank String body,
            @Size(max = 500) String imageUrl,
            Integer pageOrder,
            Boolean isActive
    ) {}

    public record ReorderRequest(
            @NotNull List<Long> orderedIds
    ) {}

    // ── 응답 DTO ──────────────────────────────────────────────

    public record TutorialResponse(
            Long id,
            Integer pageOrder,
            String title,
            String body,
            String imageUrl,
            Boolean isActive,
            Long createdById,
            LocalDateTime createdAt,
            LocalDateTime modifiedAt
    ) {
        public static TutorialResponse from(TutorialPage p) {
            return new TutorialResponse(
                    p.getId(),
                    p.getPageOrder(),
                    p.getTitle(),
                    p.getBody(),
                    p.getImageUrl(),
                    p.getIsActive(),
                    p.getCreatedBy() != null ? p.getCreatedBy().getId() : null,
                    p.getCreatedAt(),
                    p.getModifiedAt()
            );
        }
    }
}
