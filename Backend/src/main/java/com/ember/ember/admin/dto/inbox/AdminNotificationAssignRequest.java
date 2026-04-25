package com.ember.ember.admin.dto.inbox;

import jakarta.validation.constraints.NotNull;

/**
 * 알림 담당자 할당 요청 DTO (PATCH /admin/notifications/{id}/assign).
 */
public record AdminNotificationAssignRequest(
        @NotNull(message = "할당 대상 관리자 ID는 필수입니다")
        Long assignedTo
) {
}
