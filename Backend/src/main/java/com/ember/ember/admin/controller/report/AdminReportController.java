package com.ember.ember.admin.controller.report;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.report.*;
import com.ember.ember.admin.service.report.AdminReportService;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.report.domain.Report;
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
 * 관리자 신고 관리 API — 관리자 API 통합명세서 v2.1 §5.
 * Phase A-3 1차 구현: §5.1~5.7, §5.12.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/reports")
@Tag(name = "Admin Reports", description = "관리자 신고 관리 API (v2.1 §5)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminReportController {

    private final AdminReportService adminReportService;

    /** §5.1 신고 목록. */
    @GetMapping
    @Operation(summary = "신고 목록",
            description = "복합 우선순위(priority DESC, slaDeadline ASC) 정렬. assignedTo=me|unassigned|<id>, slaOverdue, minPriority 필터 지원.")
    public ResponseEntity<ApiResponse<Page<AdminReportListItemResponse>>> list(
            @RequestParam(required = false) Report.ReportStatus status,
            @RequestParam(required = false) Report.ReportReason reason,
            @RequestParam(required = false) String assignedTo,
            @RequestParam(required = false) Integer minPriority,
            @RequestParam(required = false, defaultValue = "false") boolean slaOverdue,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails admin) {
        return ResponseEntity.ok(ApiResponse.success(adminReportService.list(
                status, reason, assignedTo, admin.getUserId(), minPriority, slaOverdue, pageable)));
    }

    /** §5.2 신고 요약 통계. */
    @GetMapping("/summary")
    @Operation(summary = "신고 요약 통계",
            description = "미처리 건수 + SLA 임박(80%+) + SLA 초과 건수.")
    public ResponseEntity<ApiResponse<AdminReportSummaryResponse>> summary() {
        return ResponseEntity.ok(ApiResponse.success(adminReportService.summary()));
    }

    /** §5.12 신고 패턴 분석. */
    @GetMapping("/pattern-analysis")
    @Operation(summary = "신고 패턴 분석",
            description = "기간 내 사유/콘텐츠유형 분포 + 집중 대상/잦은 신고자 TOP N + 평균 priority/OVERDUE 비율.")
    public ResponseEntity<ApiResponse<AdminReportPatternResponse>> patternAnalysis(
            @RequestParam(defaultValue = "7") int periodDays,
            @RequestParam(defaultValue = "10") int topN) {
        return ResponseEntity.ok(ApiResponse.success(
                adminReportService.patternAnalysis(periodDays, topN)));
    }

    /** §5.3 신고 상세. */
    @GetMapping("/{reportId}")
    @Operation(summary = "신고 상세",
            description = "피신고자 최근 신고 이력 5건 + SLA 상태(ON_TRACK/WARNING/OVERDUE) 포함.")
    public ResponseEntity<ApiResponse<AdminReportDetailResponse>> getDetail(
            @PathVariable Long reportId) {
        return ResponseEntity.ok(ApiResponse.success(adminReportService.getDetail(reportId)));
    }

    /** §5.4 신고 처리. */
    @PostMapping("/{reportId}/resolve")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "신고 처리",
            description = "action 에 따라 WARNING/SUSPEND_7D/SUSPEND_PERMANENT 제재 적용 + sanction_history 기록.")
    public ResponseEntity<ApiResponse<Void>> resolve(
            @PathVariable Long reportId,
            @Valid @RequestBody AdminReportResolveRequest request,
            @AuthenticationPrincipal CustomUserDetails admin) {
        adminReportService.resolveReport(reportId, request, admin);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /** §5.5 신고 기각. */
    @PostMapping("/{reportId}/dismiss")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "신고 기각")
    public ResponseEntity<ApiResponse<Void>> dismiss(
            @PathVariable Long reportId,
            @Valid @RequestBody AdminReportDismissRequest request,
            @AuthenticationPrincipal CustomUserDetails admin) {
        adminReportService.dismissReport(reportId, request, admin);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /** §5.6 신고 맥락 조회 — PII 접근 로그 기록. */
    @GetMapping("/{reportId}/context")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "신고 맥락 조회",
            description = "신고 판단용 원문 맥락. admin_pii_access_log 자동 기록 (Fail-Closed). Phase A-3 1차는 스켈레톤 응답.")
    public ResponseEntity<ApiResponse<AdminReportContextResponse>> context(
            @PathVariable Long reportId) {
        return ResponseEntity.ok(ApiResponse.success(adminReportService.getContext(reportId)));
    }

    /** §5.7 담당자 할당. */
    @PatchMapping("/{reportId}/assign")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "신고 담당자 할당",
            description = "PENDING 상태라면 IN_REVIEW 로 전이. 이미 처리된 신고는 변경 불가.")
    public ResponseEntity<ApiResponse<Void>> assign(
            @PathVariable Long reportId,
            @Valid @RequestBody AdminReportAssignRequest request,
            @AuthenticationPrincipal CustomUserDetails admin) {
        adminReportService.assignReport(reportId, request, admin);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
