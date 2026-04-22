package com.ember.ember.admin.dto;

import com.ember.ember.admin.domain.AdminAccount;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * 관리자 계정 상세 조회 응답 — 관리자 API 통합명세서 v2.1 §13.2
 */
@Schema(description = "관리자 계정 상세 응답")
public record AdminAccountDetailResponse(
        @Schema(description = "관리자 ID") Long id,
        @Schema(description = "이메일") String email,
        @Schema(description = "관리자 이름") String adminName,
        @Schema(description = "역할") AdminAccount.AdminRole adminRole,
        @Schema(description = "상태") AdminAccount.AdminStatus status,
        @Schema(description = "프로필 이미지 URL") String profileImageUrl,
        @Schema(description = "마지막 로그인 일시") LocalDateTime lastLoginAt,
        @Schema(description = "계정 생성일") LocalDateTime createdAt,
        @Schema(description = "계정 수정일") LocalDateTime modifiedAt
) {
    public static AdminAccountDetailResponse from(AdminAccount account) {
        return new AdminAccountDetailResponse(
                account.getId(),
                account.getEmail(),
                account.getName(),
                account.getRole(),
                account.getStatus(),
                account.getProfileImageUrl(),
                account.getLastLoginAt(),
                account.getCreatedAt(),
                account.getModifiedAt()
        );
    }
}
