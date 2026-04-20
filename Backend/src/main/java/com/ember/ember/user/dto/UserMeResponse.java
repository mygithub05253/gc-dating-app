package com.ember.ember.user.dto;

import com.ember.ember.idealtype.domain.UserIdealKeyword;
import com.ember.ember.user.domain.User;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "내 프로필 조회 응답")
public record UserMeResponse(

        @Schema(description = "사용자 ID")
        Long userId,

        @Schema(description = "닉네임")
        String nickname,

        @Schema(description = "생년월일")
        String birthDate,

        @Schema(description = "성별")
        String gender,

        @Schema(description = "시/도")
        String sido,

        @Schema(description = "시/군/구")
        String sigungu,

        @Schema(description = "학교명")
        String school,

        @Schema(description = "이상형 키워드 목록")
        List<IdealKeywordInfo> idealKeywords,

        @Schema(description = "마지막 닉네임 변경일")
        LocalDateTime lastNicknameChangedAt,

        @Schema(description = "온보딩 완료 여부")
        boolean onboardingCompleted,

        @Schema(description = "온보딩 단계")
        int onboardingStep,

        @Schema(description = "마지막 로그인 일시")
        LocalDateTime lastLoginAt,

        @Schema(description = "계정 상태")
        String accountStatus,

        @Schema(description = "정지 사유")
        String suspensionReason,

        @Schema(description = "정지 해제 예정일")
        LocalDateTime suspendedUntil,

        @Schema(description = "이의신청 가능 여부")
        boolean canAppeal
) {
    public record IdealKeywordInfo(Long id, String label, String category) {}

    public static UserMeResponse from(User user, List<UserIdealKeyword> idealKeywords) {
        List<IdealKeywordInfo> keywordInfos = idealKeywords.stream()
                .map(uik -> new IdealKeywordInfo(
                        uik.getKeyword().getId(),
                        uik.getKeyword().getLabel(),
                        uik.getKeyword().getCategory()))
                .toList();

        boolean canAppeal = user.getStatus() == User.UserStatus.SUSPEND_7D
                || user.getStatus() == User.UserStatus.SUSPEND_30D;

        return new UserMeResponse(
                user.getId(),
                user.getNickname(),
                user.getBirthDate() != null ? user.getBirthDate().toString() : null,
                user.getGender() != null ? user.getGender().name() : null,
                user.getSido(),
                user.getSigungu(),
                user.getSchool(),
                keywordInfos,
                user.getLastNicknameChangedAt(),
                user.isOnboardingCompleted(),
                user.getOnboardingStep(),
                user.getLastLoginAt(),
                user.getStatus().name(),
                user.getSuspensionReason(),
                user.getSuspendedUntil(),
                canAppeal
        );
    }
}
