package com.ember.ember.notification.dto;

import com.ember.ember.notification.domain.Notification;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "알림 목록 조회 응답")
public record NotificationListResponse(

        @Schema(description = "알림 목록")
        List<NotificationItem> notifications,

        @Schema(description = "미읽음 알림 수")
        int unreadCount
) {

    @Schema(description = "알림 항목")
    public record NotificationItem(
            Long notificationId,
            String type,
            String title,
            String body,
            boolean isRead,
            LocalDateTime createdAt,
            String deepLinkUrl
    ) {
        public static NotificationItem from(Notification n) {
            return new NotificationItem(
                    n.getId(), n.getType(), n.getTitle(), n.getBody(),
                    n.getIsRead(), n.getSentAt(), n.getDeeplinkUrl()
            );
        }
    }

    public static NotificationListResponse of(List<Notification> notifications, int unreadCount) {
        return new NotificationListResponse(
                notifications.stream().map(NotificationItem::from).toList(),
                unreadCount
        );
    }
}
