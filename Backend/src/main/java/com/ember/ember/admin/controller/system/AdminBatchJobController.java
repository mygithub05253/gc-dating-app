package com.ember.ember.admin.controller.system;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.annotation.SuperAdminOnly;
import com.ember.ember.admin.dto.system.BatchJobExecutionResponse;
import com.ember.ember.admin.dto.system.BatchJobResponse;
import com.ember.ember.admin.dto.system.BatchJobRunResponse;
import com.ember.ember.admin.service.system.AdminBatchJobService;
import com.ember.ember.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 관리자 배치 작업 API — 목록 조회, 실행 이력, 수동 실행, 중단.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/batch-jobs")
@Tag(name = "관리자 배치 작업")
@SecurityRequirement(name = "bearerAuth")
public class AdminBatchJobController {

    private final AdminBatchJobService adminBatchJobService;

    @GetMapping
    @AdminOnly
    @Operation(summary = "배치 작업 목록 조회", description = "등록된 전체 배치 작업 목록")
    public ResponseEntity<ApiResponse<List<BatchJobResponse>>> getBatchJobs() {
        return ResponseEntity.ok(ApiResponse.success(adminBatchJobService.getBatchJobs()));
    }

    @GetMapping("/{jobId}/executions")
    @AdminOnly
    @Operation(summary = "배치 작업 실행 이력 조회", description = "특정 배치 작업의 실행 이력 페이징 조회")
    public ResponseEntity<ApiResponse<Page<BatchJobExecutionResponse>>> getJobExecutions(
            @PathVariable Long jobId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                adminBatchJobService.getJobExecutions(jobId, pageable)));
    }

    @PostMapping("/{jobId}/run")
    @AdminOnly
    @Operation(summary = "배치 작업 수동 실행", description = "배치 작업을 즉시 실행 트리거. 이미 실행 중이면 409 반환.")
    @AdminAction(action = "BATCH_JOB_RUN", targetType = "BATCH_JOB", targetIdParam = "jobId")
    public ResponseEntity<ApiResponse<BatchJobRunResponse>> runJob(@PathVariable Long jobId) {
        return ResponseEntity.ok(ApiResponse.success(adminBatchJobService.runJob(jobId)));
    }

    @PostMapping("/{jobId}/abort")
    @SuperAdminOnly
    @Operation(summary = "배치 작업 중단", description = "실행 중인 배치 작업을 강제 중단 (SUPER_ADMIN 전용)")
    @AdminAction(action = "BATCH_JOB_ABORT", targetType = "BATCH_JOB", targetIdParam = "jobId")
    public ResponseEntity<ApiResponse<Void>> abortJob(@PathVariable Long jobId) {
        adminBatchJobService.abortJob(jobId);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
