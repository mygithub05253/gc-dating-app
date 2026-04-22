package com.ember.ember.admin.dto.member;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 회원 정지(7일/영구) 요청 — 관리자 API §3.3 / §3.4.
 * 프런트는 {@code memo} 필드를 쓰지만 본 API는 명세 기준 {@code reason} 을 사용하며,
 * 프런트 호환은 프런트 통합 PR에서 해결한다 (명세서=정본 원칙).
 */
@Schema(description = "회원 정지 요청")
public record AdminMemberSuspendRequest(
        @Schema(description = "제재 사유") @NotBlank @Size(min = 10, max = 500) String reason
) {}
