package com.ember.ember.admin.dto.report;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 관리자 신고 기각 요청 — 관리자 API v2.1 §5.5.
 */
public record AdminReportDismissRequest(
        @NotBlank @Size(min = 1, max = 500) String reason
) {}
