package com.ember.ember.admin.dto.member;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 회원 제재 해제 요청 — 관리자 API §3.5.
 */
@Schema(description = "회원 제재 해제 요청")
public record AdminMemberReleaseRequest(
        @Schema(description = "해제 사유 분류",
                example = "APPEAL_ACCEPTED | MISJUDGMENT | MINOR_VIOLATION | EARLY_RELEASE | ETC")
        @NotNull ReasonCategory reasonCategory,

        @Schema(description = "해제 사유 상세 (10~500자)")
        @NotBlank @Size(min = 10, max = 500) String reasonDetail
) {
    public enum ReasonCategory {
        APPEAL_ACCEPTED, MISJUDGMENT, MINOR_VIOLATION, EARLY_RELEASE, ETC
    }
}
