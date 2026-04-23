package com.ember.ember.admin.dto.report;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 관리자 신고 처리 요청 — 관리자 API v2.1 §5.4.
 * action 은 처리 시 자동 부과될 제재 레벨.
 */
public record AdminReportResolveRequest(
        @NotNull ResolveAction action,
        @NotBlank @Size(min = 1, max = 500) String note
) {
    /** 처리 시 부과될 제재 — WARNING / SUSPEND_7D / SUSPEND_PERMANENT (스펙 §5.4). */
    public enum ResolveAction {
        WARNING, SUSPEND_7D, SUSPEND_PERMANENT
    }
}
