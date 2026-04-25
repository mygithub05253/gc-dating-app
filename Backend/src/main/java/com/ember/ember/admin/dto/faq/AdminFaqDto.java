package com.ember.ember.admin.dto.faq;

import com.ember.ember.notification.domain.Faq;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 관리자 FAQ DTO 모음 (명세 v2.1 §22).
 */
public final class AdminFaqDto {

    private AdminFaqDto() {}

    // ── 요청 DTO ──────────────────────────────────────────────

    public record CreateRequest(
            @NotBlank @Size(max = 20) String category,
            @NotBlank @Size(max = 200) String question,
            @NotBlank String answer,
            Integer sortOrder,
            Boolean isActive
    ) {}

    public record UpdateRequest(
            @NotBlank @Size(max = 20) String category,
            @NotBlank @Size(max = 200) String question,
            @NotBlank String answer,
            Integer sortOrder,
            Boolean isActive
    ) {}

    public record ReorderRequest(
            @NotNull List<Long> orderedIds
    ) {}

    // ── 응답 DTO ──────────────────────────────────────────────

    public record FaqResponse(
            Long id,
            String category,
            String question,
            String answer,
            Integer sortOrder,
            Boolean isActive,
            Integer viewCount,
            LocalDateTime createdAt,
            LocalDateTime modifiedAt
    ) {
        public static FaqResponse from(Faq f) {
            return new FaqResponse(
                    f.getId(),
                    f.getCategory(),
                    f.getQuestion(),
                    f.getAnswer(),
                    f.getSortOrder(),
                    f.getIsActive(),
                    f.getViewCount(),
                    f.getCreatedAt(),
                    f.getModifiedAt()
            );
        }
    }
}
