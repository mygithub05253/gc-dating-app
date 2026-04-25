package com.ember.ember.admin.controller.account;

import com.ember.ember.admin.annotation.SuperAdminOnly;
import com.ember.ember.admin.dto.PasswordChangeLogResponse;
import com.ember.ember.admin.dto.PiiAccessLogResponse;
import com.ember.ember.admin.service.AdminAuditLogService;
import com.ember.ember.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * PII 접근 로그 + 비밀번호 변경 로그 조회 API — §13 감사 로그 관리.
 * SUPER_ADMIN 전용.
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Admin Audit Log", description = "PII/비밀번호 감사 로그 조회 (§13)")
@SecurityRequirement(name = "bearerAuth")
@SuperAdminOnly
public class AdminAuditLogController {

    private final AdminAuditLogService adminAuditLogService;

    @GetMapping("/api/admin/pii-access-logs")
    @Operation(summary = "PII 접근 로그 조회 (SUPER_ADMIN)",
            description = "관리자의 개인정보 접근 이력을 조회한다.")
    public ResponseEntity<ApiResponse<Page<PiiAccessLogResponse>>> getPiiAccessLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long adminId,
            @RequestParam(required = false) Long targetUserId,
            @RequestParam(required = false) String accessType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(ApiResponse.success(
                adminAuditLogService.searchPiiAccessLogs(
                        page, size, adminId, targetUserId, accessType, startDate, endDate)));
    }

    @GetMapping("/api/admin/password-change-logs")
    @Operation(summary = "비밀번호 변경 로그 조회 (SUPER_ADMIN)",
            description = "관리자 비밀번호 변경 이력을 조회한다.")
    public ResponseEntity<ApiResponse<Page<PasswordChangeLogResponse>>> getPasswordChangeLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long adminId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(ApiResponse.success(
                adminAuditLogService.searchPasswordChangeLogs(
                        page, size, adminId, startDate, endDate)));
    }
}
