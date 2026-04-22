package com.ember.ember.admin.dto.member;

import com.ember.ember.user.domain.User;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 회원 상세 — 관리자 API 통합명세서 v2.1 §3.2.
 * VIEWER 요청: 이메일 마스킹.
 * ADMIN+ 요청: 이메일 전체 공개 + admin_pii_access_log 기록.
 */
@Schema(description = "관리자 회원 상세")
public record AdminMemberDetailResponse(
        @Schema(description = "회원 ID") Long id,
        @Schema(description = "이메일 (VIEWER 는 마스킹)") String email,
        @Schema(description = "이메일 마스킹 여부") boolean emailMasked,
        @Schema(description = "닉네임") String nickname,
        @Schema(description = "실명") String realName,
        @Schema(description = "성별") User.Gender gender,
        @Schema(description = "생년월일") LocalDate birthDate,
        @Schema(description = "시/도") String sido,
        @Schema(description = "시/군/구") String sigungu,
        @Schema(description = "학교") String school,
        @Schema(description = "상태") User.UserStatus status,
        @Schema(description = "역할") User.UserRole role,
        @Schema(description = "온보딩 완료 여부") boolean onboardingCompleted,
        @Schema(description = "가입일") LocalDateTime createdAt,
        @Schema(description = "수정일") LocalDateTime modifiedAt,
        @Schema(description = "마지막 로그인") LocalDateTime lastLoginAt,
        @Schema(description = "정지 사유") String suspensionReason,
        @Schema(description = "정지 해제 예정일") LocalDateTime suspendedUntil
) {
    public static AdminMemberDetailResponse from(User user, String email, boolean emailMasked) {
        return new AdminMemberDetailResponse(
                user.getId(), email, emailMasked,
                user.getNickname(), user.getRealName(),
                user.getGender(), user.getBirthDate(),
                user.getSido(), user.getSigungu(), user.getSchool(),
                user.getStatus(), user.getRole(),
                user.isOnboardingCompleted(),
                user.getCreatedAt(), user.getModifiedAt(),
                user.getLastLoginAt(),
                user.getSuspensionReason(), user.getSuspendedUntil()
        );
    }
}
