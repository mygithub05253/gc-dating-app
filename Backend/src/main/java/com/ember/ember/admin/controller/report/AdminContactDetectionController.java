package com.ember.ember.admin.controller.report;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.report.AdminContactDetectionActionRequest;
import com.ember.ember.admin.dto.report.AdminContactDetectionResponse;
import com.ember.ember.admin.dto.report.AdminContactDetectionStatsResponse;
import com.ember.ember.admin.service.report.AdminContactDetectionService;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.report.domain.ContactDetection;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 외부 연락처 감지 API — 관리자 API v2.1 §5.10 / §5.11.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/contact-detections")
@Tag(name = "Admin Contact Detections", description = "외부 연락처 감지 (v2.1 §5.10~5.11)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminContactDetectionController {

    private final AdminContactDetectionService adminContactDetectionService;

    @GetMapping
    @Operation(summary = "외부 연락처 감지 목록",
            description = "status / patternType / periodDays 필터. 최신 detectedAt 내림차순.")
    public ResponseEntity<ApiResponse<Page<AdminContactDetectionResponse>>> list(
            @RequestParam(required = false) ContactDetection.Status status,
            @RequestParam(required = false) ContactDetection.PatternType patternType,
            @RequestParam(required = false) Integer periodDays,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                adminContactDetectionService.list(status, patternType, periodDays, pageable)));
    }

    @GetMapping("/stats")
    @Operation(summary = "감지 패턴 분포 통계",
            description = "기간 내 패턴 타입별 분포 + 상태별 카운트.")
    public ResponseEntity<ApiResponse<AdminContactDetectionStatsResponse>> stats(
            @RequestParam(defaultValue = "7") int periodDays) {
        return ResponseEntity.ok(ApiResponse.success(adminContactDetectionService.stats(periodDays)));
    }

    @GetMapping("/{detectionId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "감지 상세 (원문 맥락 포함, PII 접근 기록)")
    public ResponseEntity<ApiResponse<AdminContactDetectionResponse>> getDetail(
            @PathVariable Long detectionId) {
        return ResponseEntity.ok(ApiResponse.success(adminContactDetectionService.getDetail(detectionId)));
    }

    @PatchMapping("/{detectionId}/action")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "감지 항목 조치",
            description = "HIDE_AND_WARN/ESCALATE_TO_REPORT → CONFIRMED, DISMISS → FALSE_POSITIVE.")
    public ResponseEntity<ApiResponse<AdminContactDetectionResponse>> action(
            @PathVariable Long detectionId,
            @Valid @RequestBody AdminContactDetectionActionRequest request,
            @AuthenticationPrincipal CustomUserDetails admin) {
        return ResponseEntity.ok(ApiResponse.success(
                adminContactDetectionService.applyAction(detectionId, request, admin)));
    }
}
