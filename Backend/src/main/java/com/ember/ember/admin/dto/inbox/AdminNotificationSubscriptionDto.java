package com.ember.ember.admin.dto.inbox;

import com.ember.ember.admin.domain.inbox.AdminNotification;
import com.ember.ember.admin.domain.inbox.AdminNotificationSubscription;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * 관리자 알림 구독 설정 DTO 모음 (조회 응답 / 수정 요청).
 */
public class AdminNotificationSubscriptionDto {

    public record SubscriptionItem(
            String category,
            AdminNotification.NotificationType alertLevel,
            List<String> channels
    ) {
        public static SubscriptionItem from(AdminNotificationSubscription entity) {
            List<String> ch = entity.getChannels() == null || entity.getChannels().isBlank()
                    ? List.of()
                    : List.of(entity.getChannels().split(","));
            return new SubscriptionItem(entity.getCategory(), entity.getAlertLevel(), ch);
        }
    }

    public record SubscriptionsResponse(
            List<SubscriptionItem> subscriptions
    ) {
    }

    /** 단일 카테고리 구독 설정 (PUT 요청 본문 1건). */
    public record SubscriptionUpdateItem(
            @NotBlank(message = "카테고리는 필수입니다")
            String category,
            @NotNull(message = "알림 수준은 필수입니다")
            AdminNotification.NotificationType alertLevel,
            @NotNull(message = "채널 목록은 필수입니다")
            @Size(min = 1, message = "채널은 최소 1개 이상 지정해야 합니다")
            List<String> channels
    ) {
    }

    /** 전체 구독 설정 일괄 수정 요청. */
    public record SubscriptionsUpdateRequest(
            @NotNull
            List<SubscriptionUpdateItem> subscriptions
    ) {
    }
}
