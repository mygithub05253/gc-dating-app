package com.ember.ember.admin.dto.event;

import com.ember.ember.admin.domain.event.PromotionEvent;

import java.time.LocalDateTime;

public record EventListResponse(
        Long id,
        String title,
        String type,
        String status,
        String target,
        LocalDateTime startDate,
        LocalDateTime endDate,
        long participantCount,
        Long createdBy,
        LocalDateTime createdAt
) {
    public static EventListResponse from(PromotionEvent event, long participantCount) {
        return new EventListResponse(
                event.getId(),
                event.getTitle(),
                event.getType().name(),
                event.getStatus().name(),
                event.getTarget().name(),
                event.getStartDate(),
                event.getEndDate(),
                participantCount,
                event.getCreatedBy(),
                event.getCreatedAt()
        );
    }
}
