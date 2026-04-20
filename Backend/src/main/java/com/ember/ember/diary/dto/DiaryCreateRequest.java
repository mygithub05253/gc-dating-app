package com.ember.ember.diary.dto;

import com.ember.ember.diary.domain.Diary.DiaryVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 일기 생성 요청 DTO.
 * 결정 1: content 200~1000자 (회의 확정).
 * 결정 2: content + visibility + topicId 3개 필드 모두 포함.
 */
public record DiaryCreateRequest(

        @NotBlank(message = "일기 내용은 필수입니다.")
        @Size(min = 200, max = 1000, message = "일기는 200~1,000자 사이여야 합니다.")
        String content,

        @NotNull(message = "공개 범위는 필수입니다.")
        DiaryVisibility visibility,

        Long topicId
) {}
