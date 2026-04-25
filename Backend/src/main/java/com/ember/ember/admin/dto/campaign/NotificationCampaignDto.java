package com.ember.ember.admin.dto.campaign;

import com.ember.ember.admin.domain.campaign.NotificationCampaign;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * 일괄 공지/푸시 캠페인 DTO 모음 (명세 v2.3 §11.1.3 Step 6).
 *
 * <p>record 기반 불변 DTO. 외부에 노출되는 응답에서는 필터 조건 JSON 원본을 그대로 반환하지 않고
 * 파싱된 {@link FilterConditions} 구조로 노출하여 UI 일관성을 확보한다.</p>
 */
public final class NotificationCampaignDto {

    private NotificationCampaignDto() {}

    // -------------------------------------------------------------------------
    // 요청 DTO
    // -------------------------------------------------------------------------

    /** 캠페인 생성 요청 (POST /admin/notification-campaigns). */
    public record CreateRequest(
            @NotBlank @Size(max = 200) String title,
            @NotBlank @Size(max = 500) String messageSubject,
            @NotBlank String messageBody,
            FilterConditions filterConditions,
            @NotEmpty Set<NotificationCampaign.SendType> sendTypes,
            LocalDateTime scheduledAt
    ) {}

    /** 미리보기 요청 (POST /admin/notification-campaigns/preview). */
    public record PreviewRequest(
            FilterConditions filterConditions
    ) {}

    /**
     * 발송 대상 필터 조건 (명세 §11.1.3 Step 3).
     *
     * <p>모든 필드는 nullable이며, null이면 해당 조건 비적용.
     * 모든 조건은 AND 결합.</p>
     *
     * @param signedUpAfter   가입일 ≥ (이후 가입자)
     * @param signedUpBefore  가입일 < (이전 가입자)
     * @param lastActiveAfter 마지막 접속 ≥ (활성 사용자 한정)
     * @param lastActiveBefore 마지막 접속 < (비활성 사용자 한정)
     * @param hasMatched      매칭 성공 경험 (true=경험 있음, false=없음)
     * @param aiConsent       AI 동의 상태 (true=동의함, false=미동의)
     * @param genders         성별 필터 (예: ["MALE", "FEMALE"])
     */
    public record FilterConditions(
            LocalDateTime signedUpAfter,
            LocalDateTime signedUpBefore,
            LocalDateTime lastActiveAfter,
            LocalDateTime lastActiveBefore,
            Boolean hasMatched,
            Boolean aiConsent,
            List<String> genders
    ) {
        /** 빈 조건 객체 (전체 사용자). */
        public static FilterConditions empty() {
            return new FilterConditions(null, null, null, null, null, null, null);
        }
    }

    // -------------------------------------------------------------------------
    // 응답 DTO
    // -------------------------------------------------------------------------

    /** 캠페인 단건 응답. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CampaignResponse(
            Long id,
            String title,
            String messageSubject,
            String messageBody,
            FilterConditions filterConditions,
            Set<NotificationCampaign.SendType> sendTypes,
            LocalDateTime scheduledAt,
            NotificationCampaign.CampaignStatus status,
            Integer targetCount,
            Integer successCount,
            Integer failureCount,
            LocalDateTime sentAt,
            LocalDateTime completedAt,
            Long createdBy,
            LocalDateTime createdAt,
            LocalDateTime modifiedAt
    ) {
        public static CampaignResponse of(NotificationCampaign campaign, FilterConditions parsedFilter) {
            return new CampaignResponse(
                    campaign.getId(),
                    campaign.getTitle(),
                    campaign.getMessageSubject(),
                    campaign.getMessageBody(),
                    parsedFilter,
                    campaign.getSendTypes(),
                    campaign.getScheduledAt(),
                    campaign.getStatus(),
                    campaign.getTargetCount(),
                    campaign.getSuccessCount(),
                    campaign.getFailureCount(),
                    campaign.getSentAt(),
                    campaign.getCompletedAt(),
                    campaign.getCreatedBy(),
                    campaign.getCreatedAt(),
                    campaign.getModifiedAt()
            );
        }
    }

    /** 캠페인 목록 응답 (페이지네이션). */
    public record CampaignListResponse(
            List<CampaignResponse> items,
            long totalElements,
            int totalPages,
            int page,
            int size
    ) {
        public static CampaignListResponse of(List<CampaignResponse> items, long totalElements,
                                              int totalPages, int page, int size) {
            return new CampaignListResponse(items, totalElements, totalPages, page, size);
        }
    }

    /** 미리보기 응답 — 대상 사용자 수만 노출 (개인정보 보호, 명세 §11.1.3 Step 7 Security). */
    public record PreviewResponse(
            int targetCount,
            String preview // 미리보기용 메시지 일부 (서버에서 그대로 반환)
    ) {}

    /** 결과 조회 응답 — 채널별 SUCCESS/FAILED + 열람률·클릭률. */
    public record CampaignResultResponse(
            Long campaignId,
            NotificationCampaign.CampaignStatus status,
            Integer targetCount,
            Integer successCount,
            Integer failureCount,
            List<ChannelResult> channelResults,
            Integer openedCount,
            Integer clickedCount,
            Double openRate,    // openedCount / successCount
            Double clickRate    // clickedCount / successCount
    ) {

        public record ChannelResult(
                NotificationCampaign.SendType sendType,
                long successCount,
                long failureCount
        ) {}
    }
}
