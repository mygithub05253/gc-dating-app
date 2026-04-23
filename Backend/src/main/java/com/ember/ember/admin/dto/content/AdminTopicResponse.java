package com.ember.ember.admin.dto.content;

import com.ember.ember.topic.domain.WeeklyTopic;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record AdminTopicResponse(
        Long id,
        String topic,
        LocalDate weekStartDate,
        String category,
        Integer usageCount,
        Boolean isActive,
        LocalDateTime createdAt
) {
    public static AdminTopicResponse from(WeeklyTopic t) {
        return new AdminTopicResponse(
                t.getId(),
                t.getTopic(),
                t.getWeekStartDate(),
                t.getCategory(),
                t.getUsageCount(),
                t.getIsActive(),
                t.getCreatedAt()
        );
    }
}
