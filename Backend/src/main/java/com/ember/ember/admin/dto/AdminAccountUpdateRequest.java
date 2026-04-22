package com.ember.ember.admin.dto;

import com.ember.ember.admin.domain.AdminAccount;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 관리자 계정 수정 요청 — 관리자 API 통합명세서 v2.1 §13.5
 * <p>이름·역할·상태 3개 필드를 수정한다. 이메일과 비밀번호는 별도 경로로 변경한다.
 */
@Schema(description = "관리자 계정 수정 요청")
public record AdminAccountUpdateRequest(
        @Schema(description = "관리자 이름") @NotNull @Size(min = 2, max = 50)
        @Pattern(regexp = "^[가-힣a-zA-Z0-9 ]+$", message = "이름은 한글·영문·숫자만 사용할 수 있습니다.")
        String adminName,

        @Schema(description = "역할") @NotNull AdminAccount.AdminRole adminRole,

        @Schema(description = "상태 (DELETED 직접 지정 불가 — 삭제 API 사용)")
        @NotNull AdminAccount.AdminStatus status
) {}
