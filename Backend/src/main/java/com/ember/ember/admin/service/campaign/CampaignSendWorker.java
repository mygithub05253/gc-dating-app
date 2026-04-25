package com.ember.ember.admin.service.campaign;

import com.ember.ember.admin.domain.campaign.NotificationCampaign;
import com.ember.ember.admin.domain.campaign.NotificationCampaign.CampaignStatus;
import com.ember.ember.admin.domain.campaign.NotificationCampaign.SendType;
import com.ember.ember.admin.domain.campaign.NotificationSendLog;
import com.ember.ember.admin.dto.campaign.NotificationCampaignDto.FilterConditions;
import com.ember.ember.admin.repository.campaign.NotificationCampaignRepository;
import com.ember.ember.admin.repository.campaign.NotificationSendLogRepository;
import com.ember.ember.global.notification.FcmService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * 캠페인 발송 워커 (명세 v2.3 §11.1.3 Phase 2-B-1).
 *
 * <p>Phase 2-B-1 범위 — PUSH 채널만</p>
 * <ul>
 *   <li>SCHEDULED + scheduled_at 도래 → SENDING 전이</li>
 *   <li>SENDING 상태 캠페인을 청크(100건) 단위로 페치하여 PUSH 발송</li>
 *   <li>발송 결과를 notification_send_log에 INSERT (UNIQUE 제약으로 중복 차단)</li>
 *   <li>모든 사용자 발송 완료 시 COMPLETED 전이</li>
 * </ul>
 *
 * <p><b>Phase 2-B-2 후속 PR로 이연</b></p>
 * <ul>
 *   <li>EMAIL 채널 (SES/SendGrid 어댑터, 키 발급 후)</li>
 *   <li>NOTICE 채널 (앱 내 공지 INSERT 연동)</li>
 *   <li>Edge Case 1 (서버 다운 5분 재시도)</li>
 *   <li>Edge Case 3 (이메일 hard bounce 5%↑ 자동 제외)</li>
 *   <li>RabbitMQ 큐 기반 분산 처리 (현재는 단일 인스턴스 가정 @Scheduled)</li>
 * </ul>
 *
 * <p><b>중복 발송 방지</b>: notification_send_log의 (campaign_id, user_id, send_type) UNIQUE 제약 +
 * 사전 existsByCampaignIdAndUserIdAndSendType 검사 두 단계로 차단.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CampaignSendWorker {

    /** 한 번의 워커 실행에서 처리할 청크 크기 — 명세 §11.1.3 Step 7 Scalability. */
    private static final int CHUNK_SIZE = 100;

    /** 한 번의 워커 실행에서 처리할 최대 청크 수 (총 1000건 / 분 한도). */
    private static final int MAX_CHUNKS_PER_TICK = 10;

    private final NotificationCampaignRepository campaignRepository;
    private final NotificationSendLogRepository sendLogRepository;
    private final CampaignFilterResolver filterResolver;
    private final FcmService fcmService;

    /**
     * 메인 워커 — 매분 0초 실행.
     * 1) SCHEDULED 캠페인 중 도래분 SENDING 전이
     * 2) SENDING 캠페인 진행
     */
    @Scheduled(cron = "0 * * * * *")
    public void tick() {
        try {
            promoteScheduledCampaigns();
            processSendingCampaigns();
        } catch (Exception e) {
            log.error("[CampaignSendWorker] tick 실행 중 예외 — 다음 주기에 재시도. 이유={}", e.getMessage(), e);
        }
    }

    /** SCHEDULED + scheduled_at 도래 → SENDING 전이. */
    @Transactional
    public void promoteScheduledCampaigns() {
        List<NotificationCampaign> due = campaignRepository.findAllByStatusAndScheduledAtLessThanEqual(
                CampaignStatus.SCHEDULED, LocalDateTime.now());
        for (NotificationCampaign c : due) {
            try {
                c.startSending();
                log.info("[CampaignSendWorker] SCHEDULED → SENDING 전이 — campaignId={} title={}",
                        c.getId(), c.getTitle());
            } catch (IllegalStateException ex) {
                log.warn("[CampaignSendWorker] 상태 전이 실패 (정상적으로 다른 워커가 처리했을 수 있음) — campaignId={}",
                        c.getId());
            }
        }
    }

    /** SENDING 캠페인 — 청크 페치 → PUSH 발송 → send_log 기록 → 완료 시 COMPLETED. */
    public void processSendingCampaigns() {
        List<NotificationCampaign> sending = campaignRepository.findAllByStatus(CampaignStatus.SENDING);
        for (NotificationCampaign c : sending) {
            processOneCampaign(c.getId());
        }
    }

    /**
     * 단일 캠페인 처리. 별 트랜잭션으로 분리해 한 캠페인 실패가 다른 캠페인에 영향 없게 한다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processOneCampaign(Long campaignId) {
        NotificationCampaign campaign = campaignRepository.findById(campaignId).orElse(null);
        if (campaign == null || campaign.getStatus() != CampaignStatus.SENDING) {
            return;
        }

        Set<SendType> sendTypes = campaign.getSendTypes();
        if (!sendTypes.contains(SendType.PUSH)) {
            // Phase 2-B-1은 PUSH만 처리. EMAIL/NOTICE는 후속 PR.
            // 다른 채널만 가진 캠페인은 일단 완료 처리하지 않고 SENDING 유지 → 후속 PR에서 처리.
            log.debug("[CampaignSendWorker] PUSH 미포함 캠페인 — 후속 PR 대기. campaignId={} sendTypes={}",
                    campaign.getId(), sendTypes);
            return;
        }

        FilterConditions filter = filterResolver.fromJson(campaign.getFilterConditionsJson());

        // 청크 단위로 사용자 ID 페치. 이미 send_log에 기록된 사용자는 SKIP.
        int processedChunks = 0;
        int chunkSuccess = 0;
        int chunkFailure = 0;

        for (int chunk = 0; chunk < MAX_CHUNKS_PER_TICK; chunk++) {
            List<Long> userIds = filterResolver.findTargetUserIds(filter, chunk * CHUNK_SIZE, CHUNK_SIZE);
            if (userIds.isEmpty()) {
                break;
            }
            for (Long userId : userIds) {
                if (sendLogRepository.existsByCampaignIdAndUserIdAndSendType(
                        campaign.getId(), userId, SendType.PUSH)) {
                    continue; // 이미 발송된 사용자
                }
                NotificationSendLog.SendStatus status;
                String failureReason = null;
                try {
                    fcmService.sendPushToUser(userId, campaign.getMessageSubject(), campaign.getMessageBody());
                    status = NotificationSendLog.SendStatus.SUCCESS;
                    chunkSuccess++;
                } catch (Exception ex) {
                    status = NotificationSendLog.SendStatus.FAILED;
                    failureReason = truncate(ex.getMessage(), 250);
                    chunkFailure++;
                    log.warn("[CampaignSendWorker] PUSH 발송 실패 — campaignId={} userId={} 이유={}",
                            campaign.getId(), userId, ex.getMessage());
                }
                sendLogRepository.save(NotificationSendLog.builder()
                        .campaignId(campaign.getId())
                        .userId(userId)
                        .sendType(SendType.PUSH)
                        .status(status)
                        .failureReason(failureReason)
                        .build());
            }
            processedChunks++;
            if (userIds.size() < CHUNK_SIZE) {
                // 마지막 청크 도달
                break;
            }
        }

        if (chunkSuccess > 0 || chunkFailure > 0) {
            campaign.recordSendResult(chunkSuccess, chunkFailure);
        }

        // 완료 판정: 누적 처리 건수가 target_count에 도달했으면 COMPLETED.
        int totalProcessed = (campaign.getSuccessCount() != null ? campaign.getSuccessCount() : 0)
                + (campaign.getFailureCount() != null ? campaign.getFailureCount() : 0);
        if (totalProcessed >= campaign.getTargetCount()) {
            campaign.complete();
            log.info("[CampaignSendWorker] 캠페인 완료 — campaignId={} success={} failure={}",
                    campaign.getId(), campaign.getSuccessCount(), campaign.getFailureCount());
        } else if (processedChunks > 0) {
            log.info("[CampaignSendWorker] 청크 처리 — campaignId={} processedChunks={} 누적success={} 누적failure={} 대상={}",
                    campaign.getId(), processedChunks, campaign.getSuccessCount(),
                    campaign.getFailureCount(), campaign.getTargetCount());
        }
    }

    private static String truncate(String text, int maxLen) {
        if (text == null) return null;
        return text.length() > maxLen ? text.substring(0, maxLen) : text;
    }
}
