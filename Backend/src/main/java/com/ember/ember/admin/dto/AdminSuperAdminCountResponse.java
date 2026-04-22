package com.ember.ember.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 활성 SUPER_ADMIN 개수 응답 — 관리자 API 통합명세서 v2.1 §13.7
 */
@Schema(description = "활성 SUPER_ADMIN 수 응답")
public record AdminSuperAdminCountResponse(
        @Schema(description = "ACTIVE 상태인 SUPER_ADMIN 수") long count
) {}
