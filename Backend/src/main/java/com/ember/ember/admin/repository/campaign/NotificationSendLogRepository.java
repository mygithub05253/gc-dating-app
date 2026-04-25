package com.ember.ember.admin.repository.campaign;

import com.ember.ember.admin.domain.campaign.NotificationCampaign;
import com.ember.ember.admin.domain.campaign.NotificationSendLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationSendLogRepository extends JpaRepository<NotificationSendLog, Long> {

    /** 결과 조회 — 캠페인의 채널·상태별 카운트. (Phase 2-A 결과 화면) */
    @Query("SELECT l.sendType, l.status, COUNT(l) " +
           "FROM NotificationSendLog l " +
           "WHERE l.campaignId = :campaignId " +
           "GROUP BY l.sendType, l.status")
    List<Object[]> aggregateByCampaign(@Param("campaignId") Long campaignId);

    /** 캠페인의 열람률·클릭률 집계 — 분모는 SUCCESS 카운트. */
    @Query("SELECT " +
           "  SUM(CASE WHEN l.openedAt IS NOT NULL THEN 1 ELSE 0 END), " +
           "  SUM(CASE WHEN l.clickedAt IS NOT NULL THEN 1 ELSE 0 END) " +
           "FROM NotificationSendLog l " +
           "WHERE l.campaignId = :campaignId AND l.status = com.ember.ember.admin.domain.campaign.NotificationSendLog.SendStatus.SUCCESS")
    Object[] aggregateOpenedClicked(@Param("campaignId") Long campaignId);

    /** 동일 캠페인+사용자+채널 발송 이력 존재 여부 — 중복 발송 가드. */
    boolean existsByCampaignIdAndUserIdAndSendType(Long campaignId, Long userId,
                                                   NotificationCampaign.SendType sendType);
}
