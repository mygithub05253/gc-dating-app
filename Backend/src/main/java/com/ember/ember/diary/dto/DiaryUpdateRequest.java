package com.ember.ember.diary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 일기 수정 요청 */
public record DiaryUpdateRequest(
        @NotBlank(message = "일기 내용은 필수입니다.")
        @Size(min = 200, max = 1000, message = "일기는 200~1,000자 사이여야 합니다.")
        String content
) {}
