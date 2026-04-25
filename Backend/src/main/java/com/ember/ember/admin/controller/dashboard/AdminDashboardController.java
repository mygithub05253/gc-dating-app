package com.ember.ember.admin.controller.dashboard;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.dashboard.DailyStatsResponse;
import com.ember.ember.admin.dto.dashboard.DashboardKpiResponse;
import com.ember.ember.admin.dto.dashboard.MatchingStatsResponse;
import com.ember.ember.admin.service.dashboard.AdminDashboardService;
import com.ember.ember.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * 관리자 대시보드 API — KPI, 일별 통계, 매칭 통계, CSV 내보내기.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/dashboard")
@AdminOnly
@Tag(name = "관리자 대시보드")
@SecurityRequirement(name = "bearerAuth")
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    // ─────────────────────────────────────────────────────────────────────
    // KPI 조회
    // ─────────────────────────────────────────────────────────────────────
    @GetMapping("/kpi")
    @Operation(summary = "핵심 KPI 조회",
        description = "DAU, MAU, 오늘 신규가입, 오늘 매칭, 대기 신고, 활성 교환방. Redis 5분 캐싱.")
    public ResponseEntity<ApiResponse<DashboardKpiResponse>> getKpi() {
        return ResponseEntity.ok(ApiResponse.success(adminDashboardService.getKpi()));
    }

    // ─────────────────────────────────────────────────────────────────────
    // 일별 통계
    // ─────────────────────────────────────────────────────────────────────
    @GetMapping("/daily-stats")
    @Operation(summary = "일별 통계 조회",
        description = "기간 내 일별 신규가입, 활성사용자, 매칭성사, 일기작성 수. generate_series로 빈 날짜 포함.")
    public ResponseEntity<ApiResponse<List<DailyStatsResponse>>> getDailyStats(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(ApiResponse.success(adminDashboardService.getDailyStats(startDate, endDate)));
    }

    // ─────────────────────────────────────────────────────────────────────
    // 매칭 통계
    // ─────────────────────────────────────────────────────────────────────
    @GetMapping("/matching-stats")
    @Operation(summary = "매칭 통계 조회",
        description = "전체 매칭 수, 성공률, 평균 매칭 소요시간, 이상형 키워드 TOP 10.")
    public ResponseEntity<ApiResponse<MatchingStatsResponse>> getMatchingStats() {
        return ResponseEntity.ok(ApiResponse.success(adminDashboardService.getMatchingStats()));
    }

    // ─────────────────────────────────────────────────────────────────────
    // CSV 내보내기
    // ─────────────────────────────────────────────────────────────────────
    @GetMapping("/summary/export")
    @Operation(summary = "일별 통계 CSV 내보내기",
        description = "기간 내 일별 통계를 CSV 파일로 다운로드.")
    public ResponseEntity<byte[]> exportSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "CSV") String format) {

        byte[] csvBytes = adminDashboardService.exportSummary(startDate, endDate, format);

        String filename = String.format("dashboard_%s_%s.csv", startDate, endDate);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
            .contentLength(csvBytes.length)
            .body(csvBytes);
    }
}
