package com.ember.ember.admin.dto;

import com.ember.ember.admin.domain.AdminAccount;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * 현재 관리자 정보 응답 — v2.3 확장 (Phase 3B CN-B2).
 * 기존 필드(adminId/email/name/role/status) + 프로필/보안 지표 필드 추가.
 */
@Schema(description = "현재 관리자 정보 응답")
public record AdminMeResponse(
        @Schema(description = "관리자 ID") Long adminId,
        @Schema(description = "이메일") String email,
        @Schema(description = "이름") String name,
        @Schema(description = "역할", example = "ADMIN") AdminAccount.AdminRole role,
        @Schema(description = "계정 상태", example = "ACTIVE") AdminAccount.AdminStatus status,
        @Schema(description = "프로필 이미지 URL(외부)") String profileImageUrl,
        @Schema(description = "마지막 로그인 시각") LocalDateTime lastLoginAt,
        @Schema(description = "최근 비밀번호 변경 시각") LocalDateTime passwordLastChangedAt
) {
    public static AdminMeResponse from(AdminAccount admin, LocalDateTime passwordLastChangedAt) {
        return new AdminMeResponse(
                admin.getId(), admin.getEmail(), admin.getName(),
                admin.getRole(), admin.getStatus(),
                admin.getProfileImageUrl(), admin.getLastLoginAt(), passwordLastChangedAt);
    }
}
