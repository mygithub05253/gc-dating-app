package com.ember.ember.admin.dto.content;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 관리자 일기 삭제 요청 DTO.
 */
public record AdminDiaryDeleteRequest(
        @NotBlank
        @Size(min = 10, message = "삭제 사유는 최소 10자 이상이어야 합니다.")
        String adminMemo
) {}
