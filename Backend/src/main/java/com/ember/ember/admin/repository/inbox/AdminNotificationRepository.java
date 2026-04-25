package com.ember.ember.admin.repository.inbox;

import com.ember.ember.admin.domain.inbox.AdminNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AdminNotificationRepository extends JpaRepository<AdminNotification, Long> {

    /**
     * 알림 목록 조회 (필터링 + 페이지네이션).
     * 명세서 §11.2 비기능: P95 < 1초, (assigned_to, status, created_at) 복합 인덱스 활용.
     */
    @Query(value = "SELECT n FROM AdminNotification n " +
                   "WHERE (:notificationType IS NULL OR n.notificationType = :notificationType) " +
                   "  AND (:category IS NULL OR n.category = :category) " +
                   "  AND (:status IS NULL OR n.status = :status) " +
                   "  AND (:assignedTo IS NULL OR n.assignedTo = :assignedTo) " +
                   "  AND (:startDate IS NULL OR n.createdAt >= :startDate) " +
                   "  AND (:endDate IS NULL OR n.createdAt < :endDate) " +
                   "ORDER BY n.createdAt DESC",
            countQuery = "SELECT COUNT(n) FROM AdminNotification n " +
                         "WHERE (:notificationType IS NULL OR n.notificationType = :notificationType) " +
                         "  AND (:category IS NULL OR n.category = :category) " +
                         "  AND (:status IS NULL OR n.status = :status) " +
                         "  AND (:assignedTo IS NULL OR n.assignedTo = :assignedTo) " +
                         "  AND (:startDate IS NULL OR n.createdAt >= :startDate) " +
                         "  AND (:endDate IS NULL OR n.createdAt < :endDate)")
    Page<AdminNotification> searchWithFilter(@Param("notificationType") AdminNotification.NotificationType notificationType,
                                             @Param("category") String category,
                                             @Param("status") AdminNotification.Status status,
                                             @Param("assignedTo") Long assignedTo,
                                             @Param("startDate") LocalDateTime startDate,
                                             @Param("endDate") LocalDateTime endDate,
                                             Pageable pageable);

    /**
     * Edge Case 2: 5분 묶음 처리 - 동일 source_type CRITICAL 알림 중 5분 내 가장 최근 건.
     */
    Optional<AdminNotification> findFirstBySourceTypeAndNotificationTypeAndCreatedAtAfterOrderByCreatedAtDesc(
            String sourceType,
            AdminNotification.NotificationType notificationType,
            LocalDateTime threshold);

    /**
     * 미읽음 카운트 (Redis 캐시 미스 시 fallback / 캐시 워밍).
     * - assignedTo가 null이면 모든 미할당 알림 카운트
     * - assignedTo가 있으면 해당 관리자에게 할당된 + 미할당 알림 카운트
     */
    @Query("SELECT COUNT(n) FROM AdminNotification n " +
           "WHERE n.status = com.ember.ember.admin.domain.inbox.AdminNotification.Status.UNREAD " +
           "  AND (n.assignedTo = :adminId OR n.assignedTo IS NULL)")
    long countUnreadForAdmin(@Param("adminId") Long adminId);

    /** Edge Case 4: 비활성 관리자에게 할당된 미해결 알림 자동 미할당 처리 대상 조회. */
    List<AdminNotification> findAllByAssignedToAndStatusNot(Long adminId, AdminNotification.Status status);
}
