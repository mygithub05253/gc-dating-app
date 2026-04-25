package com.ember.ember.admin.repository.campaign;

import com.ember.ember.admin.domain.campaign.NotificationCampaign;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationCampaignRepository extends JpaRepository<NotificationCampaign, Long> {

    /**
     * 캠페인 목록 — 상태/생성자/기간 필터 + 최신순 페이지네이션.
     * 인덱스: idx_notification_campaign_status_created.
     */
    @Query(value = "SELECT c FROM NotificationCampaign c " +
                   "WHERE (:status IS NULL OR c.status = :status) " +
                   "  AND (:createdBy IS NULL OR c.createdBy = :createdBy) " +
                   "  AND (:startDate IS NULL OR c.createdAt >= :startDate) " +
                   "  AND (:endDate IS NULL OR c.createdAt < :endDate) " +
                   "ORDER BY c.createdAt DESC",
            countQuery = "SELECT COUNT(c) FROM NotificationCampaign c " +
                         "WHERE (:status IS NULL OR c.status = :status) " +
                         "  AND (:createdBy IS NULL OR c.createdBy = :createdBy) " +
                         "  AND (:startDate IS NULL OR c.createdAt >= :startDate) " +
                         "  AND (:endDate IS NULL OR c.createdAt < :endDate)")
    Page<NotificationCampaign> searchWithFilter(@Param("status") NotificationCampaign.CampaignStatus status,
                                                @Param("createdBy") Long createdBy,
                                                @Param("startDate") LocalDateTime startDate,
                                                @Param("endDate") LocalDateTime endDate,
                                                Pageable pageable);

    /**
     * Phase 2-B 예약 스케줄러: SCHEDULED 상태이며 scheduled_at <= now인 캠페인 조회.
     * 인덱스: idx_notification_campaign_scheduled_at (partial index on status='SCHEDULED').
     */
    List<NotificationCampaign> findAllByStatusAndScheduledAtLessThanEqual(
            NotificationCampaign.CampaignStatus status,
            LocalDateTime now);
}
