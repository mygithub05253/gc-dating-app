package com.ember.ember.admin.controller.system;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.system.SystemStatusResponse;
import com.ember.ember.admin.service.system.AdminSystemStatusService;
import com.ember.ember.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 관리자 시스템 상태 API — DB, Redis, RabbitMQ, AI 서버 헬스체크.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/system")
@Tag(name = "관리자 시스템 상태")
@SecurityRequirement(name = "bearerAuth")
public class AdminSystemStatusController {

    private final AdminSystemStatusService adminSystemStatusService;

    @GetMapping("/status")
    @AdminOnly
    @Operation(summary = "시스템 상태 조회",
            description = "DB, Redis, RabbitMQ, AI 서버 연결 상태 및 응답 시간 조회. VIEWER 이상 접근 가능.")
    public ResponseEntity<ApiResponse<SystemStatusResponse>> getSystemStatus() {
        return ResponseEntity.ok(ApiResponse.success(adminSystemStatusService.getSystemStatus()));
    }
}
