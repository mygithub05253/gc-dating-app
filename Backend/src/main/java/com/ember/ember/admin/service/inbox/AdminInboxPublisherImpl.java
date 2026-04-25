package com.ember.ember.admin.service.inbox;

import com.ember.ember.admin.domain.inbox.AdminNotification;
import com.ember.ember.admin.repository.inbox.AdminNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * {@link AdminInboxPublisher} 기본 구현체.
 *
 * <p>책임</p>
 * <ul>
 *   <li>새 알림 INSERT 또는 5분 묶음 처리(Edge Case 2 — 동일 sourceType + CRITICAL 5분 내 첫 건에 grouped_count++)</li>
 *   <li>Redis 미읽음 카운터 갱신 (assignedTo 지정된 경우 +1)</li>
 *   <li>채널 발송 큐잉(Phase 1B에서 도입; 현 단계는 IN_APP 자동 표기로 충분)</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminInboxPublisherImpl implements AdminInboxPublisher {

    private static final int GROUP_WINDOW_MINUTES = 5;

    private final AdminNotificationRepository notificationRepository;
    private final AdminInboxCounterService counterService;

    @Override
    @Transactional
    public Long publish(NotificationCommand command) {
        // Edge Case 2: 동일 sourceType의 CRITICAL 알림은 5분 내 첫 알림에 묶음 카운트만 증가
        if (command.type() == AdminNotification.NotificationType.CRITICAL) {
            LocalDateTime windowStart = LocalDateTime.now().minusMinutes(GROUP_WINDOW_MINUTES);
            Optional<AdminNotification> existing = notificationRepository
                    .findFirstBySourceTypeAndNotificationTypeAndCreatedAtAfterOrderByCreatedAtDesc(
                            command.sourceType(),
                            AdminNotification.NotificationType.CRITICAL,
                            windowStart);
            if (existing.isPresent()) {
                AdminNotification anchor = existing.get();
                anchor.incrementGroupedCount();
                log.info("관리자 알림 묶음 처리(5분 윈도우): anchorId={} sourceType={} groupedCount={}",
                        anchor.getId(), command.sourceType(), anchor.getGroupedCount());
                return anchor.getId();
            }
        }

        AdminNotification notification = AdminNotification.builder()
                .notificationType(command.type())
                .category(command.category())
                .title(command.title())
                .message(command.message())
                .sourceType(command.sourceType())
                .sourceId(command.sourceId())
                .actionUrl(command.actionUrl())
                .assignedTo(command.assignedTo())
                .extraPayload(command.extraPayload())
                .build();
        notification = notificationRepository.save(notification);

        // 미읽음 카운터: 할당 대상 지정되면 +1, 미할당이면 다음 조회 시 DB COUNT로 자연 갱신
        counterService.increment(command.assignedTo());

        log.info("관리자 알림 발행: id={} type={} category={} sourceType={}",
                notification.getId(), command.type(), command.category(), command.sourceType());
        return notification.getId();
    }
}
