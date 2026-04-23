package com.ember.ember.admin.controller.report;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.report.AdminBlockListItemResponse;
import com.ember.ember.admin.dto.report.AdminBlockStatsResponse;
import com.ember.ember.admin.service.report.AdminBlockService;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.report.domain.Block;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자 차단 관리 API — 관리자 API 통합명세서 v2.1 §5.8~§5.9.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/blocks")
@Tag(name = "Admin Blocks", description = "관리자 차단 이력/통계 (v2.1 §5.8~5.9)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminBlockController {

    private final AdminBlockService adminBlockService;

    /** §5.8 차단 이력 페이지 조회. */
    @GetMapping
    @Operation(summary = "차단 이력 목록", description = "최신순. status 필터 지원.")
    public ResponseEntity<ApiResponse<Page<AdminBlockListItemResponse>>> list(
            @RequestParam(required = false) Block.BlockStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(adminBlockService.list(status, pageable)));
    }

    /** §5.9 차단 통계 + 집중 대상 TOP N. */
    @GetMapping("/stats")
    @Operation(summary = "차단 통계 + 집중 대상 TOP N",
            description = "ACTIVE/UNBLOCKED/ADMIN_CANCELLED 카운트 + 피차단 집중 대상 TOP N.")
    public ResponseEntity<ApiResponse<AdminBlockStatsResponse>> stats(
            @RequestParam(defaultValue = "10") int topN) {
        return ResponseEntity.ok(ApiResponse.success(adminBlockService.stats(topN)));
    }
}
