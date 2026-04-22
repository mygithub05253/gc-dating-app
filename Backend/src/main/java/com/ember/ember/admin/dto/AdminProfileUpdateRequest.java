package com.ember.ember.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.URL;

/**
 * 관리자 본인 프로필 수정 요청 — Phase 3B.
 * <p>이메일 변경은 §9 관리자 계정 CRUD 경로(SUPER_ADMIN 승인)로 위임한다. 본 요청은 name, profileImageUrl 만.
 */
@Schema(description = "관리자 프로필 수정 요청 — null 전달 시 해당 필드 유지")
public record AdminProfileUpdateRequest(
        @Size(min = 1, max = 50) String name,
        @URL @Size(max = 500) String profileImageUrl
) {}
