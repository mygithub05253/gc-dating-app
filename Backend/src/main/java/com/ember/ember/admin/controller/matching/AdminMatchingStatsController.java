package com.ember.ember.admin.controller.matching;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.matching.AdminMatchingStatsResponse;
import com.ember.ember.admin.service.matching.AdminMatchingStatsService;
import com.ember.ember.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자 매칭 통계 API — §7.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/matching")
@Tag(name = "Admin Matching", description = "관리자 매칭 통계 (§7)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminMatchingStatsController {

    private final AdminMatchingStatsService adminMatchingStatsService;

    /** 매칭 통계 조회. */
    @GetMapping("/stats")
    @Operation(summary = "매칭 통계",
            description = "전체 매칭 수, 매칭률, 평균 소요시간, 활성/완료 교환방 수.")
    public ResponseEntity<ApiResponse<AdminMatchingStatsResponse>> stats() {
        return ResponseEntity.ok(ApiResponse.success(adminMatchingStatsService.getStats()));
    }
}
