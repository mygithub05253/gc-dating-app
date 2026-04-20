package com.ember.ember.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "프로필 등록 요청 (온보딩 1단계)")
public record ProfileRequest(

        @Schema(description = "닉네임 (랜덤 생성 API에서 발급받은 값)")
        @NotBlank(message = "닉네임은 필수입니다.")
        @Size(max = 20, message = "닉네임은 20자 이하여야 합니다.")
        String nickname,

        @Schema(description = "실명 (2~10자, 한글)")
        @NotBlank(message = "실명은 필수입니다.")
        @Size(min = 2, max = 10, message = "실명은 2~10자여야 합니다.")
        @Pattern(regexp = "^[가-힣]+$", message = "실명은 한글만 허용됩니다.")
        String realName,

        @Schema(description = "생년월일 (YYYY-MM-DD)", example = "2000-01-01")
        @NotBlank(message = "생년월일은 필수입니다.")
        String birthDate,

        @Schema(description = "성별 (MALE/FEMALE)")
        @NotBlank(message = "성별은 필수입니다.")
        String gender,

        @Schema(description = "시/도", example = "서울특별시")
        @NotBlank(message = "시/도는 필수입니다.")
        @Size(max = 20, message = "시/도는 20자 이하여야 합니다.")
        String sido,

        @Schema(description = "시/군/구", example = "강남구")
        @NotBlank(message = "시/군/구는 필수입니다.")
        @Size(max = 20, message = "시/군/구는 20자 이하여야 합니다.")
        String sigungu,

        @Schema(description = "학교명 (선택)")
        @Size(max = 50, message = "학교명은 50자 이하여야 합니다.")
        String school
) {
}
