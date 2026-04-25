package com.ember.ember.admin.dto.terms;

import com.ember.ember.admin.domain.terms.Terms;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 관리자 약관 DTO 모음 (명세 v2.1 §10).
 */
public final class AdminTermsDto {

    private AdminTermsDto() {}

    // ── 요청 DTO ──────────────────────────────────────────────

    public record CreateRequest(
            @NotNull Terms.TermsType type,
            @NotBlank @Size(max = 200) String title,
            @NotBlank String content,
            @NotBlank @Size(max = 20) String version,
            Terms.TermsStatus status,
            Boolean isRequired,
            LocalDate effectiveDate,
            @Size(max = 500) String changeReason
    ) {}

    public record UpdateRequest(
            @NotBlank @Size(max = 200) String title,
            @NotBlank String content,
            @Size(max = 20) String version,
            Terms.TermsStatus status,
            Boolean isRequired,
            LocalDate effectiveDate,
            @Size(max = 500) String changeReason
    ) {}

    // ── 응답 DTO ──────────────────────────────────────────────

    public record TermsResponse(
            Long id,
            Terms.TermsType type,
            String title,
            String content,
            String version,
            Terms.TermsStatus status,
            Boolean isRequired,
            LocalDate effectiveDate,
            Integer acceptCount,
            Long createdBy,
            String changeReason,
            LocalDateTime createdAt,
            LocalDateTime modifiedAt
    ) {
        public static TermsResponse from(Terms t) {
            return new TermsResponse(
                    t.getId(),
                    t.getType(),
                    t.getTitle(),
                    t.getContent(),
                    t.getVersion(),
                    t.getStatus(),
                    t.getIsRequired(),
                    t.getEffectiveDate(),
                    t.getAcceptCount(),
                    t.getCreatedBy(),
                    t.getChangeReason(),
                    t.getCreatedAt(),
                    t.getModifiedAt()
            );
        }
    }
}
