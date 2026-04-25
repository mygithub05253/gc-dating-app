package com.ember.ember.admin.controller.automation;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.annotation.AdminOperator;
import com.ember.ember.admin.dto.automation.AutoNotificationRuleCreateRequest;
import com.ember.ember.admin.dto.automation.AutoNotificationRuleResponse;
import com.ember.ember.admin.service.automation.AdminAutoNotificationService;
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
 * 관리자 자동 알림 규칙 API — 목록 조회, 생성, 토글.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/auto-notification-rules")
@Tag(name = "관리자 자동 알림 규칙")
@SecurityRequirement(name = "bearerAuth")
public class AdminAutoNotificationController {

    private final AdminAutoNotificationService adminAutoNotificationService;

    @GetMapping
    @AdminOnly
    @Operation(summary = "자동 알림 규칙 목록 조회", description = "등록된 전체 자동 알림 규칙 목록")
    public ResponseEntity<ApiResponse<List<AutoNotificationRuleResponse>>> getRules() {
        return ResponseEntity.ok(ApiResponse.success(adminAutoNotificationService.getRules()));
    }

    @PostMapping
    @AdminOperator
    @Operation(summary = "자동 알림 규칙 생성", description = "새 자동 알림 규칙 등록 (ADMIN 이상)")
    @AdminAction(action = "AUTO_NOTIFICATION_RULE_CREATE", targetType = "AUTO_NOTIFICATION_RULE")
    public ResponseEntity<ApiResponse<AutoNotificationRuleResponse>> createRule(
            @RequestBody @Valid AutoNotificationRuleCreateRequest request) {
        return ResponseEntity.ok(ApiResponse.created(adminAutoNotificationService.createRule(request)));
    }

    @PatchMapping("/{ruleId}/toggle")
    @AdminOperator
    @Operation(summary = "자동 알림 규칙 활성/비활성 토글", description = "규칙 enabled 상태 반전")
    @AdminAction(action = "AUTO_NOTIFICATION_RULE_TOGGLE", targetType = "AUTO_NOTIFICATION_RULE", targetIdParam = "ruleId")
    public ResponseEntity<ApiResponse<AutoNotificationRuleResponse>> toggleRule(
            @PathVariable Long ruleId) {
        return ResponseEntity.ok(ApiResponse.success(adminAutoNotificationService.toggleRule(ruleId)));
    }
}
