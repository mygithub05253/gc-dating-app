package com.ember.ember.admin.controller.export;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.annotation.AdminOperator;
import com.ember.ember.admin.dto.export.ReportExportRequest;
import com.ember.ember.admin.dto.export.ReportExportResponse;
import com.ember.ember.admin.service.export.AdminReportExportService;
import com.ember.ember.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자 리포트 내보내기 API — 비동기 내보내기 요청 및 상태 조회.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/reports/export")
@AdminOperator
@Tag(name = "관리자 리포트 내보내기")
@SecurityRequirement(name = "bearerAuth")
public class AdminReportExportController {

    private final AdminReportExportService adminReportExportService;

    @PostMapping
    @Operation(summary = "리포트 내보내기 요청",
            description = "비동기 리포트 내보내기 요청. QUEUED 상태로 생성되며, 실제 처리는 백그라운드에서 진행.")
    @AdminAction(action = "REPORT_EXPORT_REQUEST", targetType = "REPORT_EXPORT")
    public ResponseEntity<ApiResponse<ReportExportResponse>> requestExport(
            @RequestBody @Valid ReportExportRequest request,
            @AuthenticationPrincipal Long adminId) {
        return ResponseEntity.ok(ApiResponse.created(
                adminReportExportService.requestExport(request, adminId)));
    }

    @GetMapping("/{exportId}")
    @Operation(summary = "리포트 내보내기 상태 조회",
            description = "내보내기 진행 상태 확인. COMPLETED 시 downloadUrl 반환.")
    public ResponseEntity<ApiResponse<ReportExportResponse>> getExportStatus(
            @PathVariable Long exportId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminReportExportService.getExportStatus(exportId)));
    }
}
