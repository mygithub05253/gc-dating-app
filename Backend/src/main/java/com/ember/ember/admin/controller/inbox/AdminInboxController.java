package com.ember.ember.admin.controller.inbox;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.domain.inbox.AdminNotification;
import com.ember.ember.admin.dto.inbox.AdminNotificationAssignRequest;
import com.ember.ember.admin.dto.inbox.AdminNotificationListResponse;
import com.ember.ember.admin.dto.inbox.AdminNotificationResponse;
import com.ember.ember.admin.dto.inbox.AdminNotificationSubscriptionDto;
import com.ember.ember.admin.service.inbox.AdminInboxService;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

/**
 * 관리자 알림 센터 API — 명세서 v2.3 §11.2 Step 6.
 *
 * <p>엔드포인트 6종</p>
 * <ul>
 *   <li>GET /api/admin/notifications — 목록 조회 (VIEWER+)</li>
 *   <li>PATCH /api/admin/notifications/{id}/read — 읽음 처리 (VIEWER+)</li>
 *   <li>PATCH /api/admin/notifications/{id}/assign — 담당자 할당 (ADMIN+)</li>
 *   <li>PATCH /api/admin/notifications/{id}/resolve — 처리 완료 (ADMIN+)</li>
 *   <li>GET /api/admin/notifications/subscriptions — 본인 구독 설정 조회</li>
 *   <li>PUT /api/admin/notifications/subscriptions — 본인 구독 설정 일괄 수정</li>
 * </ul>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/notifications")
@Tag(name = "Admin Inbox", description = "관리자 알림 센터 (명세 v2.3 §11.2)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminInboxController {

    private final AdminInboxService inboxService;

    @GetMapping
    @Operation(summary = "관리자 알림 목록 조회",
            description = "유형/카테고리/상태/담당자/기간으로 필터링하여 최신순으로 반환한다. " +
                          "응답에는 미읽음 카운트가 포함된다.")
    public ResponseEntity<ApiResponse<AdminNotificationListResponse>> list(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam(required = false) AdminNotification.NotificationType notificationType,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) AdminNotification.Status status,
            @RequestParam(required = false) Long assignedTo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        AdminNotificationListResponse response = inboxService.list(
                principal.getUserId(), notificationType, category, status,
                assignedTo, startDate, endDate, page, size);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{notificationId}")
    @Operation(summary = "관리자 알림 단건 조회")
    public ResponseEntity<ApiResponse<AdminNotificationResponse>> get(
            @PathVariable Long notificationId) {
        return ResponseEntity.ok(ApiResponse.success(inboxService.getOne(notificationId)));
    }

    @PatchMapping("/{notificationId}/read")
    @Operation(summary = "관리자 알림 읽음 처리",
            description = "이미 RESOLVED인 경우 변경 없이 멱등 응답.")
    public ResponseEntity<ApiResponse<AdminNotificationResponse>> markAsRead(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable Long notificationId) {
        return ResponseEntity.ok(ApiResponse.success(
                inboxService.markAsRead(notificationId, principal.getUserId())));
    }

    @PatchMapping("/{notificationId}/assign")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "관리자 알림 담당자 할당",
            description = "비활성 관리자에게 할당 시도 시 422 Unprocessable Entity.")
    public ResponseEntity<ApiResponse<AdminNotificationResponse>> assign(
            @PathVariable Long notificationId,
            @Valid @RequestBody AdminNotificationAssignRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                inboxService.assign(notificationId, request.assignedTo())));
    }

    @PatchMapping("/{notificationId}/resolve")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "관리자 알림 처리 완료",
            description = "이미 RESOLVED인 경우 409 Conflict.")
    public ResponseEntity<ApiResponse<AdminNotificationResponse>> resolve(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable Long notificationId) {
        return ResponseEntity.ok(ApiResponse.success(
                inboxService.resolve(notificationId, principal.getUserId())));
    }

    @GetMapping("/subscriptions")
    @Operation(summary = "본인의 알림 구독 설정 조회")
    public ResponseEntity<ApiResponse<AdminNotificationSubscriptionDto.SubscriptionsResponse>> getSubscriptions(
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(ApiResponse.success(
                inboxService.getSubscriptions(principal.getUserId())));
    }

    @PutMapping("/subscriptions")
    @Operation(summary = "본인의 알림 구독 설정 일괄 수정",
            description = "기존 설정을 모두 삭제하고 요청 본문대로 다시 저장 (idempotent).")
    public ResponseEntity<ApiResponse<AdminNotificationSubscriptionDto.SubscriptionsResponse>> updateSubscriptions(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody AdminNotificationSubscriptionDto.SubscriptionsUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                inboxService.updateSubscriptions(principal.getUserId(), request)));
    }
}
