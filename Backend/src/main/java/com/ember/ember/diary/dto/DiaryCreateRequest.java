package com.ember.ember.diary.dto;

import com.ember.ember.diary.domain.Diary.DiaryVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 일기 생성 요청 DTO.
 * content: 최소 100자, 최대 5000자 (스펙 기준: 앱 최소 입력 100자, 저장 최대 5000자).
 */
public record DiaryCreateRequest(

        @NotBlank(message = "일기 내용은 필수입니다.")
        @Size(min = 100, max = 5000, message = "일기 내용은 100자 이상 5000자 이하로 작성해주세요.")
        String content,

        @NotNull(message = "공개 범위는 필수입니다.")
        DiaryVisibility visibility
) {}
