package com.ember.ember.admin.dto.keyword;

import com.ember.ember.idealtype.domain.Keyword;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 관리자 이상형 키워드 DTO 모음 (명세 v2.1 §24).
 */
public final class AdminKeywordDto {

    private AdminKeywordDto() {}

    // ── 요청 DTO ──────────────────────────────────────────────

    public record CreateRequest(
            @NotBlank @Size(max = 30) String label,
            @NotBlank @Size(max = 20) String category,
            @DecimalMin("0.00") @DecimalMax("1.00") BigDecimal weight,
            Integer displayOrder,
            Boolean isActive
    ) {}

    public record UpdateRequest(
            @NotBlank @Size(max = 30) String label,
            @NotBlank @Size(max = 20) String category,
            @DecimalMin("0.00") @DecimalMax("1.00") BigDecimal weight,
            Integer displayOrder,
            Boolean isActive
    ) {}

    public record WeightUpdateRequest(
            @NotNull List<WeightItem> items
    ) {}

    public record WeightItem(
            @NotNull Long id,
            @NotNull @DecimalMin("0.00") @DecimalMax("1.00") BigDecimal weight
    ) {}

    // ── 응답 DTO ──────────────────────────────────────────────

    public record KeywordResponse(
            Long id,
            String label,
            String category,
            BigDecimal weight,
            Integer displayOrder,
            Boolean isActive,
            Long userCount,
            LocalDateTime createdAt,
            LocalDateTime modifiedAt
    ) {
        public static KeywordResponse from(Keyword k, Long userCount) {
            return new KeywordResponse(
                    k.getId(),
                    k.getLabel(),
                    k.getCategory(),
                    k.getWeight(),
                    k.getDisplayOrder(),
                    k.getIsActive(),
                    userCount,
                    k.getCreatedAt(),
                    k.getModifiedAt()
            );
        }
    }
}
