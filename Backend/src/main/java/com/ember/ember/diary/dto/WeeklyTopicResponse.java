package com.ember.ember.diary.dto;

/** 수요일 주제 응답 */
public record WeeklyTopicResponse(
        Long topicId,
        String title,
        String description,
        boolean isActive
) {}
