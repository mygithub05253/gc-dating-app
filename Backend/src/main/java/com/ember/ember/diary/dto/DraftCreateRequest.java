package com.ember.ember.diary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 임시저장 생성 요청 */
public record DraftCreateRequest(
        @NotBlank(message = "내용은 필수입니다.")
        @Size(max = 1000, message = "임시저장은 최대 1,000자까지 가능합니다.")
        String content,

        Long topicId
) {}
