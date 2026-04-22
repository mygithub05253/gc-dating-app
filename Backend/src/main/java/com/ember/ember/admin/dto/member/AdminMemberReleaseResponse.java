package com.ember.ember.admin.dto.member;

import com.ember.ember.user.domain.User;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * 회원 제재 해제 응답 — 관리자 API §3.5.
 */
@Schema(description = "회원 제재 해제 응답")
public record AdminMemberReleaseResponse(
        @Schema(description = "회원 ID") Long userId,
        @Schema(description = "이전 상태") User.UserStatus previousStatus,
        @Schema(description = "새 상태 (항상 ACTIVE)") User.UserStatus newStatus,
        @Schema(description = "해제 처리 시각") LocalDateTime releasedAt,
        @Schema(description = "sanction_history 행 ID") Long sanctionHistoryId
) {}
