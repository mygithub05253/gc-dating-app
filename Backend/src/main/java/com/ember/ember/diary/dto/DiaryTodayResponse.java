package com.ember.ember.diary.dto;

/** 당일 일기 존재 여부 응답 */
public record DiaryTodayResponse(
        boolean exists,
        Long diaryId
) {}
