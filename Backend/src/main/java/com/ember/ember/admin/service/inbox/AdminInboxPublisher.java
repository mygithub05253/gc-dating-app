package com.ember.ember.admin.service.inbox;

import com.ember.ember.admin.domain.inbox.AdminNotification;

/**
 * 다른 도메인 모듈이 관리자 알림 센터로 알림을 발행할 때 사용하는 추상화.
 *
 * <p>호출 측은 단순히 {@link #publish(NotificationCommand)}만 호출하면 되며,
 * 5분 묶음 처리(Edge Case 2) / Redis 미읽음 카운터 갱신 / 구독 매칭 / 채널 발송 큐잉은
 * 구현체에서 처리한다.</p>
 *
 * <p>호출 예 (모니터링 배치):
 * <pre>
 * publisher.publish(NotificationCommand.builder()
 *     .type(NotificationType.CRITICAL)
 *     .category("AI_MONITORING")
 *     .title("KcELECTRA 정확도 임계값 미달")
 *     .message("KcELECTRA 가중평균 정확도 73% (CRITICAL 75%)")
 *     .sourceType("AI_ACCURACY_BATCH")
 *     .sourceId("2026-04-25")
 *     .actionUrl("/admin/ai/analysis")
 *     .build());
 * </pre></p>
 */
public interface AdminInboxPublisher {

    /**
     * 알림 발행. 동기 호출이지만 채널 발송은 비동기로 큐잉된다.
     * Edge Case 2(5분 묶음): 동일 sourceType + CRITICAL 이면 5분 내 첫 알림에 grouped_count 증가.
     *
     * @return 생성되거나 묶음 처리된 알림 ID
     */
    Long publish(NotificationCommand command);

    /**
     * 호출 모듈에서 보내는 발행 명령. 빌더 + record로 호환성 유지.
     */
    record NotificationCommand(
            AdminNotification.NotificationType type,
            String category,
            String title,
            String message,
            String sourceType,
            String sourceId,
            String actionUrl,
            Long assignedTo,
            String extraPayload
    ) {

        public static Builder builder() {
            return new Builder();
        }

        public static class Builder {
            private AdminNotification.NotificationType type;
            private String category;
            private String title;
            private String message;
            private String sourceType;
            private String sourceId;
            private String actionUrl;
            private Long assignedTo;
            private String extraPayload;

            public Builder type(AdminNotification.NotificationType type) { this.type = type; return this; }
            public Builder category(String category) { this.category = category; return this; }
            public Builder title(String title) { this.title = title; return this; }
            public Builder message(String message) { this.message = message; return this; }
            public Builder sourceType(String sourceType) { this.sourceType = sourceType; return this; }
            public Builder sourceId(String sourceId) { this.sourceId = sourceId; return this; }
            public Builder actionUrl(String actionUrl) { this.actionUrl = actionUrl; return this; }
            public Builder assignedTo(Long assignedTo) { this.assignedTo = assignedTo; return this; }
            public Builder extraPayload(String extraPayload) { this.extraPayload = extraPayload; return this; }

            public NotificationCommand build() {
                if (type == null || category == null || title == null
                        || message == null || sourceType == null) {
                    throw new IllegalArgumentException(
                            "type, category, title, message, sourceType은 필수 항목입니다");
                }
                return new NotificationCommand(type, category, title, message,
                        sourceType, sourceId, actionUrl, assignedTo, extraPayload);
            }
        }
    }
}
