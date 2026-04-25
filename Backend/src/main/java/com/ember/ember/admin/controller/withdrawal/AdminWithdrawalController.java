package com.ember.ember.admin.controller.withdrawal;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.withdrawal.WithdrawalLogResponse;
import com.ember.ember.admin.dto.withdrawal.WithdrawalStatsResponse;
import com.ember.ember.admin.service.withdrawal.AdminWithdrawalService;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * 관리자 탈퇴 분석 API — 통계 조회, 로그 목록.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/withdrawal")
@AdminOnly
@Tag(name = "관리자 탈퇴 분석")
@SecurityRequirement(name = "bearerAuth")
public class AdminWithdrawalController {

    private final AdminWithdrawalService adminWithdrawalService;

    @GetMapping("/stats")
    @Operation(summary = "탈퇴 통계 조회")
    public ResponseEntity<ApiResponse<WithdrawalStatsResponse>> getWithdrawalStats(
            @RequestParam(defaultValue = "30d") String period) {
        return ResponseEntity.ok(ApiResponse.success(
                adminWithdrawalService.getWithdrawalStats(period)));
    }

    @GetMapping("/logs")
    @Operation(summary = "탈퇴 로그 목록 조회")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Page<WithdrawalLogResponse>>> getWithdrawalLogs(
            @PageableDefault(size = 20) Pageable pageable,
            @RequestParam(required = false) String reason,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(ApiResponse.success(
                adminWithdrawalService.getWithdrawalLogs(pageable, reason, startDate, endDate)));
    }
}
