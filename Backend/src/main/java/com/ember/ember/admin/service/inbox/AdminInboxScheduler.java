package com.ember.ember.admin.service.inbox;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.admin.domain.inbox.AdminNotification;
import com.ember.ember.admin.repository.AdminAccountRepository;
import com.ember.ember.admin.repository.inbox.AdminNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 관리자 알림 센터 운영 배치 (명세 v2.3 §11.2 Step 5 / Step 7).
 *
 * <p>두 가지 책임</p>
 * <ul>
 *   <li><b>에스컬레이션</b> (Edge Case 3): 30분 이상 미할당된 CRITICAL 알림을 SUPER_ADMIN에게 통보</li>
 *   <li><b>보관 정리</b> (Step 7 Data Integrity): 매일 04시 — INFO 90일↑ / RESOLVED 90일↑ / CRITICAL·WARN 180일↑ 일괄 삭제</li>
 * </ul>
 *
 * <p><b>발행 채널</b>: 본 단계에서는 {@link AdminInboxPublisher}로 IN_APP 알림만 생성한다.
 * 이메일/Slack 채널 발송 어댑터는 Phase 1B-3b 후속 PR에서 도입.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminInboxScheduler {

    /** 30분 — 명세 §11.2 Edge Case 3. */
    private static final long ESCALATION_THRESHOLD_MINUTES = 30;

    /** 90일 — INFO + RESOLVED 보관. */
    private static final long RETENTION_DAYS_NORMAL = 90;

    /** 180일 — CRITICAL/WARN 보관. */
    private static final long RETENTION_DAYS_LONG = 180;

    private final AdminNotificationRepository notificationRepository;
    private final AdminAccountRepository adminAccountRepository;
    private final AdminInboxPublisher publisher;

    /**
     * 에스컬레이션 배치 — 매 5분 실행.
     * 30분 이상 미할당된 CRITICAL 알림을 찾아 ACTIVE SUPER_ADMIN 모두에게 ESCALATION_X sourceType으로 알림 발행.
     */
    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void escalateUnassignedCritical() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(ESCALATION_THRESHOLD_MINUTES);
        List<AdminNotification> overdue = notificationRepository.findUnassignedCriticalOlderThan(threshold);
        if (overdue.isEmpty()) {
            return;
        }

        List<AdminAccount> superAdmins = adminAccountRepository.findAllByRoleAndStatus(
                AdminAccount.AdminRole.SUPER_ADMIN,
                AdminAccount.AdminStatus.ACTIVE);
        if (superAdmins.isEmpty()) {
            log.warn("[AdminInboxScheduler] ACTIVE SUPER_ADMIN 부재 — 에스컬레이션 보류. overdueCount={}",
                    overdue.size());
            return;
        }

        int published = 0;
        for (AdminNotification origin : overdue) {
            String escalationSource = "ESCALATION_" + origin.getId();
            // 한 SUPER_ADMIN에게만 1차 발행 — 다수 SUPER_ADMIN 환경이면 라운드로빈/우선순위 향후 검토.
            // 본 단계에서는 첫 SUPER_ADMIN에 할당하고 나머지는 미할당 알림으로 노출.
            AdminAccount primary = superAdmins.get(0);
            try {
                publisher.publish(AdminInboxPublisher.NotificationCommand.builder()
                        .type(AdminNotification.NotificationType.CRITICAL)
                        .category("ESCALATION")
                        .title("30분 이상 미처리 CRITICAL 알림: " + truncate(origin.getTitle(), 80))
                        .message(String.format("원본 알림 #%d (sourceType=%s) 이 %d분 이상 미할당 상태입니다. " +
                                                "즉시 담당자를 지정해 주세요.",
                                origin.getId(), origin.getSourceType(), ESCALATION_THRESHOLD_MINUTES))
                        .sourceType(escalationSource)
                        .sourceId(String.valueOf(origin.getId()))
                        .actionUrl("/admin/notifications/" + origin.getId())
                        .assignedTo(primary.getId())
                        .build());
                published++;
            } catch (Exception ex) {
                log.warn("[AdminInboxScheduler] 에스컬레이션 알림 발행 실패 — originId={}, 이유={}",
                        origin.getId(), ex.getMessage());
            }
        }
        log.info("[AdminInboxScheduler] 에스컬레이션 발행 — overdueCount={}, publishedCount={}",
                overdue.size(), published);
    }

    /**
     * 보관 정리 배치 — 매일 04:00 KST 실행.
     * - INFO 90일↑ 삭제 (RESOLVED와 무관)
     * - RESOLVED 90일↑ 삭제 (CRITICAL/WARN 처리 완료된 노이즈 제거)
     * - CRITICAL/WARN 180일↑ 삭제 (감사 보존 기간 후)
     */
    @Scheduled(cron = "0 0 4 * * *")
    @Transactional
    public void cleanupExpiredNotifications() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime normalThreshold = now.minusDays(RETENTION_DAYS_NORMAL);
        LocalDateTime longThreshold = now.minusDays(RETENTION_DAYS_LONG);

        int infoDeleted = notificationRepository.deleteInfoOlderThan(normalThreshold);
        int resolvedDeleted = notificationRepository.deleteResolvedOlderThan(normalThreshold);
        int longDeleted = notificationRepository.deleteCriticalWarnOlderThan(longThreshold);

        log.info("[AdminInboxScheduler] 보관 정리 완료 — INFO 90일↑={}, RESOLVED 90일↑={}, CRITICAL/WARN 180일↑={}",
                infoDeleted, resolvedDeleted, longDeleted);
    }

    private static String truncate(String text, int maxLen) {
        if (text == null) return "";
        return text.length() > maxLen ? text.substring(0, maxLen) + "..." : text;
    }
}
