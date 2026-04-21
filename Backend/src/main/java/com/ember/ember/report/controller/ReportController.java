package com.ember.ember.report.controller;

import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.report.dto.*;
import com.ember.ember.report.service.BlockService;
import com.ember.ember.report.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Tag(name = "Report/Block", description = "신고/차단 API")
public class ReportController {

    private final ReportService reportService;
    private final BlockService blockService;

    /** 8.1 사용자 신고 ��수 */
    @PostMapping("/api/users/{targetUserId}/report")
    @Operation(summary = "사용자 신고", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<ReportResponse>> reportUser(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long targetUserId,
            @Valid @RequestBody ReportRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(
                        reportService.createReport(userDetails.getUserId(), targetUserId, request)));
    }

    /** 8.2 사용자 차단 */
    @PostMapping("/api/users/{targetUserId}/block")
    @Operation(summary = "사���자 차단 (연쇄 종료 ��함)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<BlockResponse>> blockUser(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long targetUserId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(
                        blockService.blockUser(userDetails.getUserId(), targetUserId)));
    }

    /** 8.3 차단 해제 */
    @DeleteMapping("/api/users/{targetUserId}/block")
    @Operation(summary = "차단 해제", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<BlockResponse>> unblockUser(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long targetUserId) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        blockService.unblockUser(userDetails.getUserId(), targetUserId)));
    }

    /** 8.4 차단 목록 조회 */
    @GetMapping("/api/users/me/block-list")
    @Operation(summary = "차단 목록 조회 (커서 기반 페이징)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<BlockListResponse>> getBlockList(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) Long cursor,
            @RequestParam(required = false) Integer size) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        blockService.getBlockList(userDetails.getUserId(), cursor, size)));
    }
}
