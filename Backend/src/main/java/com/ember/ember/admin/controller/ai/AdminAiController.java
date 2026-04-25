package com.ember.ember.admin.controller.ai;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.annotation.SuperAdminOnly;
import com.ember.ember.admin.dto.ai.AiAbTestConfigRequest;
import com.ember.ember.admin.dto.ai.AiAbTestResultsResponse;
import com.ember.ember.admin.dto.ai.AiPipelineMetricsResponse;
import com.ember.ember.admin.dto.ai.AiReanalyzeResponse;
import com.ember.ember.admin.service.ai.AdminAiService;
import com.ember.ember.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자 AI 관리 API — §8 AI 관리.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/ai")
@Tag(name = "Admin AI", description = "AI 관리 (명세 §8)")
@SecurityRequirement(name = "bearerAuth")
public class AdminAiController {

    private final AdminAiService adminAiService;

    @AdminOnly
    @PostMapping("/reanalyze/{diaryId}")
    @Operation(summary = "AI 재분석 트리거", description = "일기의 AI 분석을 재실행한다.")
    public ResponseEntity<ApiResponse<AiReanalyzeResponse>> reanalyze(@PathVariable Long diaryId) {
        return ResponseEntity.ok(ApiResponse.success(adminAiService.reanalyze(diaryId)));
    }

    @AdminOnly
    @GetMapping("/pipeline/metrics")
    @Operation(summary = "AI 파이프라인 메트릭", description = "분석 건수, 실패 건수, 성공률 등 파이프라인 현황을 조회한다.")
    public ResponseEntity<ApiResponse<AiPipelineMetricsResponse>> getPipelineMetrics() {
        return ResponseEntity.ok(ApiResponse.success(adminAiService.getPipelineMetrics()));
    }

    @AdminOnly
    @GetMapping("/ab-test/results")
    @Operation(summary = "A/B 테스트 결과 조회", description = "현재 A/B 테스트 미활성 상태이므로 빈 결과를 반환한다.")
    public ResponseEntity<ApiResponse<AiAbTestResultsResponse>> getAbTestResults() {
        return ResponseEntity.ok(ApiResponse.success(adminAiService.getAbTestResults()));
    }

    @SuperAdminOnly
    @PostMapping("/ab-test/config")
    @Operation(summary = "A/B 테스트 설정 (SUPER_ADMIN)", description = "A/B 테스트 설정을 저장한다. 현재 스텁 구현.")
    public ResponseEntity<ApiResponse<Void>> saveAbTestConfig(@Valid @RequestBody AiAbTestConfigRequest request) {
        adminAiService.saveAbTestConfig(request);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
