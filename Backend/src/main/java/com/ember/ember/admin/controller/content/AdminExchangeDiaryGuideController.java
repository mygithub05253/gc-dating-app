package com.ember.ember.admin.controller.content;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.content.AdminExchangeFlowStatsResponse;
import com.ember.ember.admin.dto.content.AdminGuideStepResponse;
import com.ember.ember.admin.dto.content.AdminGuideStepsUpdateRequest;
import com.ember.ember.admin.service.content.AdminExchangeDiaryGuideService;
import com.ember.ember.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 관리자 교환일기 흐름 / 가이드 API — 관리자 API v2.1 §6.7 + 교환일기 흐름 통계 (계획 A-4).
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin")
@Tag(name = "Admin Content - Exchange Diary Flow", description = "교환일기 흐름 가이드 + 깔때기 통계 (v2.1 §6.7)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminExchangeDiaryGuideController {

    private final AdminExchangeDiaryGuideService adminExchangeDiaryGuideService;

    /** §6.7 GET 가이드 단계 전체. */
    @GetMapping("/exchange-diary-guide")
    @Operation(summary = "교환일기 가이드 단계 조회")
    public ResponseEntity<ApiResponse<List<AdminGuideStepResponse>>> getGuide() {
        return ResponseEntity.ok(ApiResponse.success(adminExchangeDiaryGuideService.listSteps()));
    }

    /** §6.7 PUT 가이드 단계 전체 교체. */
    @PutMapping("/exchange-diary-guide/steps")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "가이드 단계 전체 교체",
            description = "트랜잭션으로 기존 단계 삭제 + 새 단계 INSERT.")
    public ResponseEntity<ApiResponse<List<AdminGuideStepResponse>>> replaceGuide(
            @Valid @RequestBody AdminGuideStepsUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminExchangeDiaryGuideService.replaceSteps(request)));
    }

    /** 교환일기 흐름 집계 — 계획서 A-4 흐름 시각화. */
    @GetMapping("/exchange-rooms/flow-stats")
    @Operation(summary = "교환일기 흐름(깔때기) 통계",
            description = "기간 내 방 상태별 깔때기. periodDays 기본 30일.")
    public ResponseEntity<ApiResponse<AdminExchangeFlowStatsResponse>> flowStats(
            @RequestParam(defaultValue = "30") int periodDays) {
        return ResponseEntity.ok(ApiResponse.success(
                adminExchangeDiaryGuideService.flowStats(periodDays)));
    }
}
