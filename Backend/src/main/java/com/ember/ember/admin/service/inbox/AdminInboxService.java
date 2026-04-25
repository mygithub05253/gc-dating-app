package com.ember.ember.admin.service.inbox;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.admin.domain.inbox.AdminNotification;
import com.ember.ember.admin.dto.inbox.AdminNotificationListResponse;
import com.ember.ember.admin.dto.inbox.AdminNotificationResponse;
import com.ember.ember.admin.dto.inbox.AdminNotificationSubscriptionDto;
import com.ember.ember.admin.repository.AdminAccountRepository;
import com.ember.ember.admin.repository.inbox.AdminNotificationRepository;
import com.ember.ember.admin.repository.inbox.AdminNotificationSubscriptionRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 관리자 알림 센터 비즈니스 서비스 (명세서 v2.3 §11.2 Step 6 API).
 *
 * <p>주요 책임</p>
 * <ul>
 *   <li>알림 목록 조회 (필터 + 페이지네이션 + 미읽음 카운트)</li>
 *   <li>읽음 처리 / 담당자 할당 / 처리 완료</li>
 *   <li>구독 설정 조회 / 일괄 수정</li>
 * </ul>
 *
 * <p>채널 발송과 5분 묶음 발행 로직은 {@link AdminInboxPublisher} 구현체에 위임한다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminInboxService {

    private static final int MAX_PAGE_SIZE = 100;

    private final AdminNotificationRepository notificationRepository;
    private final AdminNotificationSubscriptionRepository subscriptionRepository;
    private final AdminAccountRepository adminAccountRepository;
    private final AdminInboxCounterService counterService;

    /**
     * 알림 목록 조회 ({@code GET /admin/notifications}).
     */
    public AdminNotificationListResponse list(Long currentAdminId,
                                              AdminNotification.NotificationType notificationType,
                                              String category,
                                              AdminNotification.Status status,
                                              Long assignedTo,
                                              LocalDateTime startDate,
                                              LocalDateTime endDate,
                                              int page,
                                              int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);
        Pageable pageable = PageRequest.of(safePage, safeSize);
        Page<AdminNotification> result = notificationRepository.searchWithFilter(
                notificationType, category, status, assignedTo, startDate, endDate, pageable);
        Page<AdminNotificationResponse> mapped = result.map(AdminNotificationResponse::from);
        long unread = counterService.getUnreadCount(currentAdminId);
        return AdminNotificationListResponse.of(mapped, unread);
    }

    /**
     * 알림 단건 조회.
     */
    public AdminNotificationResponse getOne(Long notificationId) {
        AdminNotification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_NOTIFICATION_NOT_FOUND));
        return AdminNotificationResponse.from(notification);
    }

    /**
     * 알림 읽음 처리 ({@code PATCH /admin/notifications/{id}/read}).
     * Edge Case: 이미 RESOLVED 상태면 변경하지 않고 멱등 응답.
     */
    @Transactional
    public AdminNotificationResponse markAsRead(Long notificationId, Long currentAdminId) {
        AdminNotification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_NOTIFICATION_NOT_FOUND));
        boolean changed = notification.markAsRead();
        if (changed) {
            counterService.decrement(notification.getAssignedTo() != null ? notification.getAssignedTo() : currentAdminId);
        }
        return AdminNotificationResponse.from(notification);
    }

    /**
     * 담당자 할당 ({@code PATCH /admin/notifications/{id}/assign}).
     * 비활성 관리자에게 할당 시도 시 422 (Edge Case 명세).
     */
    @Transactional
    public AdminNotificationResponse assign(Long notificationId, Long assigneeId) {
        AdminNotification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_NOTIFICATION_NOT_FOUND));
        AdminAccount assignee = adminAccountRepository.findById(assigneeId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_NOTIFICATION_ASSIGNEE_INACTIVE));
        if (assignee.getStatus() != AdminAccount.AdminStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.ADM_NOTIFICATION_ASSIGNEE_INACTIVE);
        }
        Long previous = notification.getAssignedTo();
        notification.assignTo(assigneeId);
        // 기존 담당자 카운터는 -1, 신규 담당자 +1 (UNREAD/READ 알림에 한해)
        if (notification.getStatus() != AdminNotification.Status.RESOLVED) {
            counterService.decrement(previous);
            counterService.increment(assigneeId);
        }
        return AdminNotificationResponse.from(notification);
    }

    /**
     * 처리 완료 ({@code PATCH /admin/notifications/{id}/resolve}).
     * 이미 RESOLVED 상태면 409 Conflict.
     */
    @Transactional
    public AdminNotificationResponse resolve(Long notificationId, Long currentAdminId) {
        AdminNotification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_NOTIFICATION_NOT_FOUND));
        boolean changed = notification.resolve(currentAdminId);
        if (!changed) {
            throw new BusinessException(ErrorCode.ADM_NOTIFICATION_ALREADY_RESOLVED);
        }
        // RESOLVED 처리 시 미읽음 카운터 감소 (UNREAD였던 경우만 의미 있음)
        counterService.decrement(notification.getAssignedTo() != null ? notification.getAssignedTo() : currentAdminId);
        return AdminNotificationResponse.from(notification);
    }

    /**
     * 구독 설정 조회 ({@code GET /admin/notifications/subscriptions}).
     */
    public AdminNotificationSubscriptionDto.SubscriptionsResponse getSubscriptions(Long adminId) {
        var items = subscriptionRepository.findAllByAdminId(adminId).stream()
                .map(AdminNotificationSubscriptionDto.SubscriptionItem::from)
                .toList();
        return new AdminNotificationSubscriptionDto.SubscriptionsResponse(items);
    }

    /**
     * 구독 설정 일괄 수정 ({@code PUT /admin/notifications/subscriptions}).
     * 기존 설정을 모두 삭제하고 요청 본문대로 다시 저장한다(idempotent).
     */
    @Transactional
    public AdminNotificationSubscriptionDto.SubscriptionsResponse updateSubscriptions(
            Long adminId,
            AdminNotificationSubscriptionDto.SubscriptionsUpdateRequest request) {
        validateChannels(request.subscriptions());
        subscriptionRepository.deleteAllByAdminId(adminId);
        List<com.ember.ember.admin.domain.inbox.AdminNotificationSubscription> entities = new ArrayList<>();
        for (AdminNotificationSubscriptionDto.SubscriptionUpdateItem item : request.subscriptions()) {
            entities.add(com.ember.ember.admin.domain.inbox.AdminNotificationSubscription.builder()
                    .adminId(adminId)
                    .category(item.category())
                    .alertLevel(item.alertLevel())
                    .channels(String.join(",", item.channels()))
                    .build());
        }
        subscriptionRepository.saveAll(entities);
        return getSubscriptions(adminId);
    }

    private void validateChannels(List<AdminNotificationSubscriptionDto.SubscriptionUpdateItem> items) {
        for (AdminNotificationSubscriptionDto.SubscriptionUpdateItem item : items) {
            for (String channel : item.channels()) {
                if (!isValidChannel(channel)) {
                    throw new BusinessException(ErrorCode.ADM_NOTIFICATION_INVALID_CHANNEL);
                }
            }
        }
    }

    private boolean isValidChannel(String channel) {
        return "EMAIL".equals(channel) || "SLACK".equals(channel) || "IN_APP".equals(channel);
    }
}
