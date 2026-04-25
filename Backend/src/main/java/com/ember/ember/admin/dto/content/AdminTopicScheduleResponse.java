package com.ember.ember.admin.dto.content;

import java.time.LocalDate;

/**
 * 주간 주제 스케줄 응답 DTO.
 */
public record AdminTopicScheduleResponse(
        Long topicId,
        String topic,
        String category,
        LocalDate weekStartDate,
        Integer usageCount,
        Boolean isActive
) {}
