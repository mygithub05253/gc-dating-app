package com.ember.ember.admin.dto.inbox;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * 관리자 알림 목록 응답 DTO. 페이지네이션 메타와 미읽음 카운트를 함께 반환한다.
 */
public record AdminNotificationListResponse(
        List<AdminNotificationResponse> items,
        long totalElements,
        int totalPages,
        int page,
        int size,
        long unreadCount
) {

    public static AdminNotificationListResponse of(Page<AdminNotificationResponse> page, long unreadCount) {
        return new AdminNotificationListResponse(
                page.getContent(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.getNumber(),
                page.getSize(),
                unreadCount
        );
    }
}
