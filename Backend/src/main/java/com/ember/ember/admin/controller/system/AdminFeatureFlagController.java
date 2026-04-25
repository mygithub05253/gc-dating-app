package com.ember.ember.admin.controller.system;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.annotation.SuperAdminOnly;
import com.ember.ember.admin.domain.system.FeatureFlag.FlagCategory;
import com.ember.ember.admin.dto.system.FeatureFlagHistoryResponse;
import com.ember.ember.admin.dto.system.FeatureFlagResponse;
import com.ember.ember.admin.dto.system.FeatureFlagRollbackRequest;
import com.ember.ember.admin.dto.system.FeatureFlagUpdateRequest;
import com.ember.ember.admin.service.system.AdminFeatureFlagService;
import com.ember.ember.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 관리자 기능 플래그 API — 조회, 토글, 이력, 롤백.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/feature-flags")
@Tag(name = "관리자 기능 플래그")
@SecurityRequirement(name = "bearerAuth")
public class AdminFeatureFlagController {

    private final AdminFeatureFlagService adminFeatureFlagService;

    @GetMapping
    @AdminOnly
    @Operation(summary = "기능 플래그 목록 조회", description = "전체 또는 카테고리별 기능 플래그 목록")
    public ResponseEntity<ApiResponse<List<FeatureFlagResponse>>> getFeatureFlags(
            @RequestParam(required = false) FlagCategory category) {
        return ResponseEntity.ok(ApiResponse.success(
                adminFeatureFlagService.getFeatureFlags(category)));
    }

    @PutMapping("/{flagKey}")
    @SuperAdminOnly
    @Operation(summary = "기능 플래그 토글", description = "플래그 활성/비활성 설정 + 변경 이력 기록 + Redis 캐시 무효화")
    @AdminAction(action = "FEATURE_FLAG_UPDATE", targetType = "FEATURE_FLAG", targetIdParam = "flagKey")
    public ResponseEntity<ApiResponse<FeatureFlagResponse>> updateFlag(
            @PathVariable String flagKey,
            @RequestBody @Valid FeatureFlagUpdateRequest request,
            @AuthenticationPrincipal Long adminId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminFeatureFlagService.updateFlag(flagKey, request, adminId)));
    }

    @GetMapping("/{flagKey}/history")
    @AdminOnly
    @Operation(summary = "기능 플래그 변경 이력 조회", description = "특정 플래그의 변경 이력 페이징 조회")
    public ResponseEntity<ApiResponse<Page<FeatureFlagHistoryResponse>>> getFlagHistory(
            @PathVariable String flagKey,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                adminFeatureFlagService.getFlagHistory(flagKey, pageable)));
    }

    @PostMapping("/{flagKey}/rollback")
    @SuperAdminOnly
    @Operation(summary = "기능 플래그 롤백", description = "이력의 이전 값으로 복원")
    @AdminAction(action = "FEATURE_FLAG_ROLLBACK", targetType = "FEATURE_FLAG", targetIdParam = "flagKey")
    public ResponseEntity<ApiResponse<FeatureFlagResponse>> rollbackFlag(
            @PathVariable String flagKey,
            @RequestBody @Valid FeatureFlagRollbackRequest request,
            @AuthenticationPrincipal Long adminId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminFeatureFlagService.rollbackFlag(flagKey, request, adminId)));
    }
}
