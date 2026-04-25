package com.ember.ember.admin.dto.inbox;

import com.ember.ember.admin.domain.inbox.AdminNotification;

import java.time.LocalDateTime;

/**
 * 관리자 알림 단건 응답 DTO. 목록/상세 양쪽에서 사용한다.
 */
public record AdminNotificationResponse(
        Long id,
        AdminNotification.NotificationType notificationType,
        String category,
        String title,
        String message,
        String sourceType,
        String sourceId,
        String actionUrl,
        AdminNotification.Status status,
        Long assignedTo,
        Long resolvedBy,
        LocalDateTime resolvedAt,
        Integer groupedCount,
        LocalDateTime createdAt
) {

    public static AdminNotificationResponse from(AdminNotification entity) {
        return new AdminNotificationResponse(
                entity.getId(),
                entity.getNotificationType(),
                entity.getCategory(),
                entity.getTitle(),
                entity.getMessage(),
                entity.getSourceType(),
                entity.getSourceId(),
                entity.getActionUrl(),
                entity.getStatus(),
                entity.getAssignedTo(),
                entity.getResolvedBy(),
                entity.getResolvedAt(),
                entity.getGroupedCount(),
                entity.getCreatedAt()
        );
    }
}
