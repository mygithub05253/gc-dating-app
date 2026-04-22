package com.ember.ember.admin.controller.account;

import com.ember.ember.admin.annotation.SuperAdminOnly;
import com.ember.ember.admin.dto.AdminAuditLogResponse;
import com.ember.ember.admin.service.AdminAccountService;
import com.ember.ember.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * 관리자 활동(감사) 로그 조회 API — 관리자 API 통합명세서 v2.1 §13.8
 * SUPER_ADMIN 전용. CSV 내보내기(§13.9)는 후속 PR에서 확장한다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/activity-logs")
@Tag(name = "Admin Activity Log", description = "관리자 감사 로그 조회 API (v2.1 §13.8)")
@SecurityRequirement(name = "bearerAuth")
@SuperAdminOnly
public class AdminActivityLogController {

    private final AdminAccountService adminAccountService;

    /** §13.8 관리자 활동 로그 페이지네이션 조회 */
    @GetMapping
    @Operation(summary = "관리자 활동 로그 조회",
            description = "admin_audit_logs 기반. 기본 범위는 최근 7일. performedAt 내림차순.")
    public ResponseEntity<ApiResponse<Page<AdminAuditLogResponse>>> list(
            @RequestParam(required = false) Long adminId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                adminAccountService.searchAuditLogs(adminId, action, targetType, startDate, endDate, search, pageable)));
    }
}
