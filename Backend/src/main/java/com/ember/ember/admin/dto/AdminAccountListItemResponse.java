package com.ember.ember.admin.dto;

import com.ember.ember.admin.domain.AdminAccount;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * 관리자 계정 목록 조회 응답 항목 — 관리자 API 통합명세서 v2.1 §13.1
 */
@Schema(description = "관리자 계정 목록 항목")
public record AdminAccountListItemResponse(
        @Schema(description = "관리자 ID") Long id,
        @Schema(description = "이메일") String email,
        @Schema(description = "관리자 이름") String adminName,
        @Schema(description = "역할") AdminAccount.AdminRole adminRole,
        @Schema(description = "상태") AdminAccount.AdminStatus status,
        @Schema(description = "마지막 로그인 일시") LocalDateTime lastLoginAt,
        @Schema(description = "계정 생성일") LocalDateTime createdAt
) {
    public static AdminAccountListItemResponse from(AdminAccount account) {
        return new AdminAccountListItemResponse(
                account.getId(),
                account.getEmail(),
                account.getName(),
                account.getRole(),
                account.getStatus(),
                account.getLastLoginAt(),
                account.getCreatedAt()
        );
    }
}
