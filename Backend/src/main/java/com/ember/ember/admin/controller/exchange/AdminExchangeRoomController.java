package com.ember.ember.admin.controller.exchange;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.exchange.AdminExchangeRoomDetailResponse;
import com.ember.ember.admin.dto.exchange.AdminExchangeRoomListResponse;
import com.ember.ember.admin.service.exchange.AdminExchangeRoomService;
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

/**
 * 관리자 교환일기 방 API — §7.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/exchange-rooms")
@Tag(name = "Admin Exchange Rooms", description = "관리자 교환일기 방 조회 (§7)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminExchangeRoomController {

    private final AdminExchangeRoomService adminExchangeRoomService;

    /** 교환일기 방 목록 조회. */
    @GetMapping
    @Operation(summary = "교환일기 방 목록",
            description = "status 필터 지원: ACTIVE, COMPLETED, EXPIRED, TERMINATED 등.")
    public ResponseEntity<ApiResponse<Page<AdminExchangeRoomListResponse>>> list(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                adminExchangeRoomService.list(status, pageable)));
    }

    /** 교환일기 방 상세 조회. */
    @GetMapping("/{roomId}")
    @Operation(summary = "교환일기 방 상세",
            description = "방 정보 + 작성된 교환일기 목록 포함.")
    public ResponseEntity<ApiResponse<AdminExchangeRoomDetailResponse>> detail(
            @PathVariable Long roomId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminExchangeRoomService.getDetail(roomId)));
    }
}
