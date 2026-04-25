package com.ember.ember.admin.controller.automation;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.annotation.AdminOperator;
import com.ember.ember.admin.annotation.SuperAdminOnly;
import com.ember.ember.admin.dto.automation.AutoSanctionRuleCreateRequest;
import com.ember.ember.admin.dto.automation.AutoSanctionRuleResponse;
import com.ember.ember.admin.service.automation.AdminAutoSanctionService;
import com.ember.ember.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 관리자 자동 제재 규칙 API — 목록 조회, 생성, 토글.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/auto-sanction-rules")
@Tag(name = "관리자 자동 제재 규칙")
@SecurityRequirement(name = "bearerAuth")
public class AdminAutoSanctionController {

    private final AdminAutoSanctionService adminAutoSanctionService;

    @GetMapping
    @AdminOnly
    @Operation(summary = "자동 제재 규칙 목록 조회", description = "등록된 전체 자동 제재 규칙 목록")
    public ResponseEntity<ApiResponse<List<AutoSanctionRuleResponse>>> getRules() {
        return ResponseEntity.ok(ApiResponse.success(adminAutoSanctionService.getRules()));
    }

    @PostMapping
    @SuperAdminOnly
    @Operation(summary = "자동 제재 규칙 생성", description = "새 자동 제재 규칙 등록 (SUPER_ADMIN 전용)")
    @AdminAction(action = "AUTO_SANCTION_RULE_CREATE", targetType = "AUTO_SANCTION_RULE")
    public ResponseEntity<ApiResponse<AutoSanctionRuleResponse>> createRule(
            @RequestBody @Valid AutoSanctionRuleCreateRequest request) {
        return ResponseEntity.ok(ApiResponse.created(adminAutoSanctionService.createRule(request)));
    }

    @PatchMapping("/{ruleId}/toggle")
    @AdminOperator
    @Operation(summary = "자동 제재 규칙 활성/비활성 토글", description = "규칙 enabled 상태 반전")
    @AdminAction(action = "AUTO_SANCTION_RULE_TOGGLE", targetType = "AUTO_SANCTION_RULE", targetIdParam = "ruleId")
    public ResponseEntity<ApiResponse<AutoSanctionRuleResponse>> toggleRule(
            @PathVariable Long ruleId) {
        return ResponseEntity.ok(ApiResponse.success(adminAutoSanctionService.toggleRule(ruleId)));
    }
}
