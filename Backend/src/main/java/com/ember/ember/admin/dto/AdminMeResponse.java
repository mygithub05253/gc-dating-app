package com.ember.ember.admin.dto;

import com.ember.ember.admin.domain.AdminAccount;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "현재 관리자 정보 응답")
public record AdminMeResponse(

        @Schema(description = "관리자 ID")
        Long adminId,

        @Schema(description = "이메일")
        String email,

        @Schema(description = "이름")
        String name,

        @Schema(description = "역할", example = "ADMIN")
        AdminAccount.AdminRole role,

        @Schema(description = "계정 상태", example = "ACTIVE")
        AdminAccount.AdminStatus status
) {
        public static AdminMeResponse from(AdminAccount admin) {
                return new AdminMeResponse(admin.getId(), admin.getEmail(), admin.getName(),
                                admin.getRole(), admin.getStatus());
        }
}
