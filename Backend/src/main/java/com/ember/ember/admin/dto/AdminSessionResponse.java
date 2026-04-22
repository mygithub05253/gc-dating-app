package com.ember.ember.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * 관리자 활성 세션 응답.
 * <p>Phase 3B 단순화: 현재는 단일 Refresh Token 세션만 관리하므로 항상 1건(현재 세션) 반환.
 * 다중 세션 지원은 후속 스프린트에서 {@code admin:rt:{adminId}:{sessionId}} 구조 도입 후 확장.
 */
@Schema(description = "관리자 세션 응답")
public record AdminSessionResponse(
        @Schema(description = "세션 식별자(현재는 'current' 고정)") String sessionId,
        @Schema(description = "디바이스 정보(User-Agent 축약)") String device,
        @Schema(description = "IP 주소") String ipAddress,
        @Schema(description = "최근 로그인 시각") LocalDateTime issuedAt,
        @Schema(description = "현재 세션 여부") boolean current
) {}
