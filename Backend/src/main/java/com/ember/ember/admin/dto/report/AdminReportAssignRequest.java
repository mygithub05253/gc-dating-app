package com.ember.ember.admin.dto.report;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 관리자 신고 담당자 할당 요청 — 관리자 API v2.1 §5.7.
 */
public record AdminReportAssignRequest(
        @NotNull Long assigneeId,
        @Size(max = 500) String reason
) {}
