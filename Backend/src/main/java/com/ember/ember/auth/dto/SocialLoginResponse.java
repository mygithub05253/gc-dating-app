package com.ember.ember.auth.dto;

import com.ember.ember.user.domain.User;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "소셜 로그인 응답")
public record SocialLoginResponse(

        @Schema(description = "JWT accessToken (PENDING_DELETION 시 null)")
        String accessToken,

        @Schema(description = "JWT refreshToken (PENDING_DELETION 시 null)")
        String refreshToken,

        @Schema(description = "신규 가입 여부")
        boolean isNewUser,

        @Schema(description = "사용자 ID")
        Long userId,

        @Schema(description = "온보딩 완료 여부")
        boolean onboardingCompleted,

        @Schema(description = "온보딩 단계 (0=미시작, 1=프로필완료, 2=이상형완료)")
        int onboardingStep,

        @Schema(description = "계정 상태 (ACTIVE 또는 PENDING_DELETION)")
        String accountStatus,

        @Schema(description = "계정 복구 토큰 (PENDING_DELETION 시에만)")
        String restoreToken
) {
    public static SocialLoginResponse of(User user, String accessToken, String refreshToken,
                                          boolean isNewUser, String restoreToken) {
        boolean isPendingDeletion = user.getStatus() == User.UserStatus.DEACTIVATED;
        return new SocialLoginResponse(
                isPendingDeletion ? null : accessToken,
                isPendingDeletion ? null : refreshToken,
                isNewUser,
                user.getId(),
                user.isOnboardingCompleted(),
                user.getOnboardingStep(),
                isPendingDeletion ? "PENDING_DELETION" : "ACTIVE",
                restoreToken
        );
    }
}
