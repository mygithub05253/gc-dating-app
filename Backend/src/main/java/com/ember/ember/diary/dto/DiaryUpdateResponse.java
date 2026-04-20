package com.ember.ember.diary.dto;

/** 일기 수정 응답 */
public record DiaryUpdateResponse(
        Long diaryId,
        String content,
        String updatedAt,
        String summary
) {}
