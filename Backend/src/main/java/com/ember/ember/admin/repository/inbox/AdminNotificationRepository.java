package com.ember.ember.admin.repository.inbox;

import com.ember.ember.admin.domain.inbox.AdminNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
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
                   "  AND (CAST(:assignedTo AS long) IS NULL OR n.assignedTo = :assignedTo) " +
                   "  AND (CAST(:startDate AS timestamp) IS NULL OR n.createdAt >= :startDate) " +
                   "  AND (CAST(:endDate AS timestamp) IS NULL OR n.createdAt < :endDate) " +
                   "ORDER BY n.createdAt DESC",
            countQuery = "SELECT COUNT(n) FROM AdminNotification n " +
                         "WHERE (:notificationType IS NULL OR n.notificationType = :notificationType) " +
                         "  AND (:category IS NULL OR n.category = :category) " +
                         "  AND (:status IS NULL OR n.status = :status) " +
                         "  AND (CAST(:assignedTo AS long) IS NULL OR n.assignedTo = :assignedTo) " +
                         "  AND (CAST(:startDate AS timestamp) IS NULL OR n.createdAt >= :startDate) " +
                         "  AND (CAST(:endDate AS timestamp) IS NULL OR n.createdAt < :endDate)")
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

    /**
     * Edge Case 3 — 30분 미할당 CRITICAL 알림 조회 (에스컬레이션 대상).
     * status가 RESOLVED 가 아니고, assignedTo IS NULL, createdAt이 임계 시각보다 이전인 알림.
     * 동일 알림에 대한 에스컬레이션 중복 방지를 위해 sourceType이 ESCALATION 으로 시작하지 않는 것만.
     */
    @Query("SELECT n FROM AdminNotification n " +
           "WHERE n.notificationType = com.ember.ember.admin.domain.inbox.AdminNotification.NotificationType.CRITICAL " +
           "  AND n.status <> com.ember.ember.admin.domain.inbox.AdminNotification.Status.RESOLVED " +
           "  AND n.assignedTo IS NULL " +
           "  AND n.createdAt < :threshold " +
           "  AND (n.sourceType IS NULL OR n.sourceType NOT LIKE 'ESCALATION_%')")
    List<AdminNotification> findUnassignedCriticalOlderThan(@Param("threshold") LocalDateTime threshold);

    /**
     * 보관 정책 정리 — RESOLVED 상태이며 modifiedAt이 임계 시각 이전인 알림 일괄 삭제.
     * RESOLVED만 90일, 그 외는 180일 (호출 측에서 두 번 호출하여 분기 처리).
     */
    @Modifying
    @Query("DELETE FROM AdminNotification n " +
           "WHERE n.status = com.ember.ember.admin.domain.inbox.AdminNotification.Status.RESOLVED " +
           "  AND n.modifiedAt < :threshold")
    int deleteResolvedOlderThan(@Param("threshold") LocalDateTime threshold);

    /**
     * 180일 보관 정책 — CRITICAL/WARN 알림 처리 완료 여부 무관 만료분 삭제.
     */
    @Modifying
    @Query("DELETE FROM AdminNotification n " +
           "WHERE n.notificationType IN " +
           "  (com.ember.ember.admin.domain.inbox.AdminNotification.NotificationType.CRITICAL, " +
           "   com.ember.ember.admin.domain.inbox.AdminNotification.NotificationType.WARN) " +
           "  AND n.createdAt < :threshold")
    int deleteCriticalWarnOlderThan(@Param("threshold") LocalDateTime threshold);

    /**
     * 90일 보관 정책 — INFO 알림 만료분 삭제 (RESOLVED와 무관하게).
     */
    @Modifying
    @Query("DELETE FROM AdminNotification n " +
           "WHERE n.notificationType = com.ember.ember.admin.domain.inbox.AdminNotification.NotificationType.INFO " +
           "  AND n.createdAt < :threshold")
    int deleteInfoOlderThan(@Param("threshold") LocalDateTime threshold);
}
