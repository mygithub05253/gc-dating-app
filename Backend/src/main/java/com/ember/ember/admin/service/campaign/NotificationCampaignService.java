package com.ember.ember.admin.service.campaign;

import com.ember.ember.admin.domain.campaign.NotificationCampaign;
import com.ember.ember.admin.domain.campaign.NotificationSendLog;
import com.ember.ember.admin.dto.campaign.NotificationCampaignDto;
import com.ember.ember.admin.dto.campaign.NotificationCampaignDto.CampaignListResponse;
import com.ember.ember.admin.dto.campaign.NotificationCampaignDto.CampaignResponse;
import com.ember.ember.admin.dto.campaign.NotificationCampaignDto.CampaignResultResponse;
import com.ember.ember.admin.dto.campaign.NotificationCampaignDto.CreateRequest;
import com.ember.ember.admin.dto.campaign.NotificationCampaignDto.FilterConditions;
import com.ember.ember.admin.dto.campaign.NotificationCampaignDto.PreviewRequest;
import com.ember.ember.admin.dto.campaign.NotificationCampaignDto.PreviewResponse;
import com.ember.ember.admin.repository.campaign.NotificationCampaignRepository;
import com.ember.ember.admin.repository.campaign.NotificationSendLogRepository;
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
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * 일괄 공지/푸시 캠페인 서비스 (명세 v2.3 §11.1.3 Step 6).
 *
 * <p>Phase 2-A 책임</p>
 * <ul>
 *   <li>캠페인 생성/조회/목록 (DRAFT)</li>
 *   <li>대상 미리보기 (필터 → 카운트, 메시지 미리보기)</li>
 *   <li>승인 (DRAFT → SCHEDULED 또는 SENDING)</li>
 *   <li>취소 (SCHEDULED → CANCELLED)</li>
 *   <li>결과 조회 (success/failure/openRate/clickRate)</li>
 * </ul>
 *
 * <p>실제 발송은 Phase 2-B 비동기 워커가 담당. 본 서비스는 상태 전이까지만 수행.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationCampaignService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int PREVIEW_TEXT_MAX = 200;

    private final NotificationCampaignRepository campaignRepository;
    private final NotificationSendLogRepository sendLogRepository;
    private final CampaignFilterResolver filterResolver;

    // -------------------------------------------------------------------------
    // 목록 / 단건
    // -------------------------------------------------------------------------

    public CampaignListResponse list(NotificationCampaign.CampaignStatus status,
                                     Long createdBy,
                                     LocalDateTime startDate,
                                     LocalDateTime endDate,
                                     int page,
                                     int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);
        Pageable pageable = PageRequest.of(safePage, safeSize);

        Page<NotificationCampaign> result = campaignRepository.searchWithFilter(
                status, createdBy, startDate, endDate, pageable);

        List<CampaignResponse> items = new ArrayList<>(result.getNumberOfElements());
        for (NotificationCampaign campaign : result.getContent()) {
            items.add(toResponse(campaign));
        }
        return CampaignListResponse.of(
                items,
                result.getTotalElements(),
                result.getTotalPages(),
                safePage,
                safeSize);
    }

    public CampaignResponse get(Long campaignId) {
        return toResponse(loadCampaign(campaignId));
    }

    // -------------------------------------------------------------------------
    // 생성 / 미리보기 / 승인 / 취소
    // -------------------------------------------------------------------------

    @Transactional
    public CampaignResponse create(CreateRequest request, Long currentAdminId) {
        FilterConditions safeFilter = request.filterConditions() != null
                ? request.filterConditions()
                : FilterConditions.empty();
        String filterJson = filterResolver.toJson(safeFilter);

        // 생성 시점에 target_count 스냅샷 저장 (UI에서 즉시 표시)
        long targetCount = filterResolver.countTargets(safeFilter);

        NotificationCampaign campaign = NotificationCampaign.builder()
                .title(request.title())
                .messageSubject(request.messageSubject())
                .messageBody(request.messageBody())
                .filterConditionsJson(filterJson)
                .sendTypes(request.sendTypes())
                .scheduledAt(request.scheduledAt())
                .targetCount((int) Math.min(targetCount, Integer.MAX_VALUE))
                .createdBy(currentAdminId)
                .build();

        NotificationCampaign saved = campaignRepository.save(campaign);
        log.info("[캠페인 생성] id={} title={} targetCount={} createdBy={}",
                saved.getId(), saved.getTitle(), saved.getTargetCount(), currentAdminId);
        return toResponse(saved);
    }

    public PreviewResponse preview(PreviewRequest request) {
        FilterConditions safeFilter = request.filterConditions() != null
                ? request.filterConditions()
                : FilterConditions.empty();
        long count = filterResolver.countTargets(safeFilter);
        return new PreviewResponse((int) Math.min(count, Integer.MAX_VALUE),
                String.format("필터 조건에 매칭되는 활성 사용자 %d명에게 발송됩니다.", count));
    }

    @Transactional
    public CampaignResponse approve(Long campaignId, Long currentAdminId) {
        NotificationCampaign campaign = loadCampaign(campaignId);
        if (campaign.getStatus() == NotificationCampaign.CampaignStatus.COMPLETED) {
            throw new BusinessException(ErrorCode.ADM_CAMPAIGN_ALREADY_COMPLETED);
        }
        try {
            campaign.approve();
        } catch (IllegalStateException e) {
            log.warn("[캠페인 승인 실패] id={} reason={}", campaignId, e.getMessage());
            throw new BusinessException(ErrorCode.ADM_CAMPAIGN_INVALID_STATUS);
        }
        // target_count 스냅샷 새로 고침 (생성 시점 이후 사용자가 변동했을 수 있음)
        FilterConditions filter = filterResolver.fromJson(campaign.getFilterConditionsJson());
        long currentCount = filterResolver.countTargets(filter);
        campaign.refreshTargetCount((int) Math.min(currentCount, Integer.MAX_VALUE));

        log.info("[캠페인 승인] id={} adminId={} newStatus={} targetCount={}",
                campaignId, currentAdminId, campaign.getStatus(), campaign.getTargetCount());
        return toResponse(campaign);
    }

    @Transactional
    public CampaignResponse cancel(Long campaignId, Long currentAdminId) {
        NotificationCampaign campaign = loadCampaign(campaignId);
        try {
            campaign.cancel();
        } catch (IllegalStateException e) {
            log.warn("[캠페인 취소 실패] id={} reason={}", campaignId, e.getMessage());
            throw new BusinessException(ErrorCode.ADM_CAMPAIGN_INVALID_STATUS);
        }
        log.info("[캠페인 취소] id={} adminId={}", campaignId, currentAdminId);
        return toResponse(campaign);
    }

    // -------------------------------------------------------------------------
    // 결과
    // -------------------------------------------------------------------------

    public CampaignResultResponse result(Long campaignId) {
        NotificationCampaign campaign = loadCampaign(campaignId);

        // 채널×상태 카운트 집계
        Map<NotificationCampaign.SendType, long[]> channelCounts = new EnumMap<>(NotificationCampaign.SendType.class);
        for (Object[] row : sendLogRepository.aggregateByCampaign(campaignId)) {
            NotificationCampaign.SendType type = (NotificationCampaign.SendType) row[0];
            NotificationSendLog.SendStatus st = (NotificationSendLog.SendStatus) row[1];
            long count = ((Number) row[2]).longValue();
            channelCounts.computeIfAbsent(type, k -> new long[]{0L, 0L});
            if (st == NotificationSendLog.SendStatus.SUCCESS) {
                channelCounts.get(type)[0] = count;
            } else {
                channelCounts.get(type)[1] = count;
            }
        }
        List<CampaignResultResponse.ChannelResult> channelResults = new ArrayList<>();
        for (var entry : channelCounts.entrySet()) {
            channelResults.add(new CampaignResultResponse.ChannelResult(
                    entry.getKey(), entry.getValue()[0], entry.getValue()[1]));
        }

        // 열람·클릭 집계
        Object[] openClick = sendLogRepository.aggregateOpenedClicked(campaignId);
        long opened = 0;
        long clicked = 0;
        if (openClick != null && openClick.length >= 2) {
            opened = openClick[0] != null ? ((Number) openClick[0]).longValue() : 0;
            clicked = openClick[1] != null ? ((Number) openClick[1]).longValue() : 0;
        }
        int success = campaign.getSuccessCount() != null ? campaign.getSuccessCount() : 0;
        Double openRate = success > 0 ? ((double) opened) / success : null;
        Double clickRate = success > 0 ? ((double) clicked) / success : null;

        return new CampaignResultResponse(
                campaignId,
                campaign.getStatus(),
                campaign.getTargetCount(),
                campaign.getSuccessCount(),
                campaign.getFailureCount(),
                channelResults,
                (int) opened,
                (int) clicked,
                openRate,
                clickRate
        );
    }

    // -------------------------------------------------------------------------
    // 헬퍼
    // -------------------------------------------------------------------------

    private NotificationCampaign loadCampaign(Long campaignId) {
        return campaignRepository.findById(campaignId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_CAMPAIGN_NOT_FOUND));
    }

    private CampaignResponse toResponse(NotificationCampaign campaign) {
        FilterConditions parsed = filterResolver.fromJson(campaign.getFilterConditionsJson());
        return CampaignResponse.of(campaign, parsed);
    }
}
