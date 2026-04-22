package com.ember.ember.admin.dto.member;

import com.ember.ember.user.domain.User;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 회원 목록 항목 — 관리자 API 통합명세서 v2.1 §3.1.
 * 목록에서는 이메일을 항상 마스킹하여 내보낸다 (VIEWER 이상 공통).
 */
@Schema(description = "관리자 회원 목록 항목")
public record AdminMemberListItemResponse(
        @Schema(description = "회원 ID") Long id,
        @Schema(description = "닉네임") String nickname,
        @Schema(description = "실명") String realName,
        @Schema(description = "마스킹 이메일") String email,
        @Schema(description = "성별") User.Gender gender,
        @Schema(description = "생년월일") LocalDate birthDate,
        @Schema(description = "지역 (시/도)") String sido,
        @Schema(description = "지역 (시/군/구)") String sigungu,
        @Schema(description = "상태") User.UserStatus status,
        @Schema(description = "마지막 로그인") LocalDateTime lastLoginAt,
        @Schema(description = "가입일") LocalDateTime createdAt
) {
    public static AdminMemberListItemResponse from(User user, String maskedEmail) {
        return new AdminMemberListItemResponse(
                user.getId(), user.getNickname(), user.getRealName(), maskedEmail,
                user.getGender(), user.getBirthDate(), user.getSido(), user.getSigungu(),
                user.getStatus(), user.getLastLoginAt(), user.getCreatedAt()
        );
    }
}
