package com.ember.ember.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 관리자 이메일 중복 확인 응답 — 관리자 API 통합명세서 v2.1 §13.4
 */
@Schema(description = "이메일 사용 가능 여부 응답")
public record AdminEmailAvailabilityResponse(
        @Schema(description = "사용 가능 여부 (true=미사용)") boolean available
) {}
