package com.ember.ember.admin.controller.campaign;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.domain.campaign.NotificationCampaign;
import com.ember.ember.admin.dto.campaign.NotificationCampaignDto.CampaignListResponse;
import com.ember.ember.admin.dto.campaign.NotificationCampaignDto.CampaignResponse;
import com.ember.ember.admin.dto.campaign.NotificationCampaignDto.CampaignResultResponse;
import com.ember.ember.admin.dto.campaign.NotificationCampaignDto.CreateRequest;
import com.ember.ember.admin.dto.campaign.NotificationCampaignDto.PreviewRequest;
import com.ember.ember.admin.dto.campaign.NotificationCampaignDto.PreviewResponse;
import com.ember.ember.admin.service.campaign.NotificationCampaignService;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

/**
 * 일괄 공지/푸시 캠페인 API — 명세 v2.3 §11.1.3 Step 6.
 *
 * <p>엔드포인트 6종 (목록 + 5개 명세서 정의)</p>
 * <ul>
 *   <li>GET /api/admin/notification-campaigns — 캠페인 목록 (VIEWER+)</li>
 *   <li>GET /api/admin/notification-campaigns/{id} — 캠페인 단건 (VIEWER+)</li>
 *   <li>POST /api/admin/notification-campaigns — 캠페인 생성 (ADMIN+)</li>
 *   <li>POST /api/admin/notification-campaigns/preview — 대상 수 미리보기 (ADMIN+)</li>
 *   <li>POST /api/admin/notification-campaigns/{id}/approve — 발송 승인 (ADMIN+)</li>
 *   <li>POST /api/admin/notification-campaigns/{id}/cancel — 예약 취소 (ADMIN+)</li>
 *   <li>GET /api/admin/notification-campaigns/{id}/result — 결과 조회 (VIEWER+)</li>
 * </ul>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/notification-campaigns")
@Tag(name = "Admin Notification Campaign", description = "일괄 공지/푸시 캠페인 (명세 v2.3 §11.1.3)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class NotificationCampaignController {

    private final NotificationCampaignService campaignService;

    @GetMapping
    @Operation(summary = "캠페인 목록 조회",
            description = "상태/생성자/기간으로 필터링하여 최신순으로 반환한다.")
    public ResponseEntity<ApiResponse<CampaignListResponse>> list(
            @RequestParam(required = false) NotificationCampaign.CampaignStatus status,
            @RequestParam(required = false) Long createdBy,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                campaignService.list(status, createdBy, startDate, endDate, page, size)));
    }

    @GetMapping("/{campaignId}")
    @Operation(summary = "캠페인 단건 조회")
    public ResponseEntity<ApiResponse<CampaignResponse>> get(@PathVariable Long campaignId) {
        return ResponseEntity.ok(ApiResponse.success(campaignService.get(campaignId)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "캠페인 생성 (DRAFT)",
            description = "필터 조건과 메시지를 포함한 캠페인을 DRAFT 상태로 생성한다. " +
                          "생성 시점에 target_count 스냅샷이 저장된다.")
    public ResponseEntity<ApiResponse<CampaignResponse>> create(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody CreateRequest request) {
        CampaignResponse created = campaignService.create(request, principal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @PostMapping("/preview")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "발송 대상 수 미리보기",
            description = "필터 조건에 매칭되는 활성 사용자 수를 반환한다. 사용자 목록은 노출하지 않는다 (개인정보 보호).")
    public ResponseEntity<ApiResponse<PreviewResponse>> preview(@Valid @RequestBody PreviewRequest request) {
        return ResponseEntity.ok(ApiResponse.success(campaignService.preview(request)));
    }

    @PostMapping("/{campaignId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "캠페인 발송 승인",
            description = "DRAFT → SCHEDULED(예약 발송) 또는 SENDING(즉시 발송)으로 전환. " +
                          "이미 발송 완료된 캠페인은 409 Conflict (복사본 생성 안내).")
    public ResponseEntity<ApiResponse<CampaignResponse>> approve(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable Long campaignId) {
        return ResponseEntity.ok(ApiResponse.success(
                campaignService.approve(campaignId, principal.getUserId())));
    }

    @PostMapping("/{campaignId}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "예약 캠페인 취소",
            description = "SCHEDULED 상태에서만 취소 가능. SENDING 중이면 409 Conflict.")
    public ResponseEntity<ApiResponse<CampaignResponse>> cancel(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable Long campaignId) {
        return ResponseEntity.ok(ApiResponse.success(
                campaignService.cancel(campaignId, principal.getUserId())));
    }

    @GetMapping("/{campaignId}/result")
    @Operation(summary = "캠페인 결과 조회",
            description = "성공/실패 카운트, 채널별 결과, 열람률·클릭률을 반환한다. " +
                          "Phase 2-B 발송 워커 가동 후 의미 있는 값이 채워진다.")
    public ResponseEntity<ApiResponse<CampaignResultResponse>> result(@PathVariable Long campaignId) {
        return ResponseEntity.ok(ApiResponse.success(campaignService.result(campaignId)));
    }
}
