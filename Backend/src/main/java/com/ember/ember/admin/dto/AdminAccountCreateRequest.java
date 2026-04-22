package com.ember.ember.admin.dto;

import com.ember.ember.admin.domain.AdminAccount;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 관리자 계정 생성 요청 — 관리자 API 통합명세서 v2.1 §13.3
 * <p>비밀번호 규칙: 8자 이상 + 영문 대소문자/숫자/특수문자 조합.
 */
@Schema(description = "관리자 계정 생성 요청")
public record AdminAccountCreateRequest(
        @Schema(description = "이메일") @NotBlank @Email @Size(max = 255) String email,

        @Schema(description = "관리자 이름") @NotBlank @Size(min = 2, max = 50)
        @Pattern(regexp = "^[가-힣a-zA-Z0-9 ]+$", message = "이름은 한글·영문·숫자만 사용할 수 있습니다.")
        String adminName,

        @Schema(description = "비밀번호 (평문, 서버에서 BCrypt 해싱)")
        @NotBlank
        @Size(min = 8, max = 72)
        @Pattern(
                regexp = "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]).+$",
                message = "비밀번호는 영문 대소문자·숫자·특수문자를 모두 포함해야 합니다."
        )
        String password,

        @Schema(description = "역할") @NotNull AdminAccount.AdminRole adminRole,

        @Schema(description = "계정 상태 (기본 ACTIVE)") AdminAccount.AdminStatus status,

        @Schema(description = "초기 비밀번호 이메일 발송 여부 (기본 false)") Boolean sendEmail
) {}
