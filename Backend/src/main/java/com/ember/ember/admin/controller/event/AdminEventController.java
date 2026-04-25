package com.ember.ember.admin.controller.event;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.event.*;
import com.ember.ember.admin.service.event.AdminEventService;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자 이벤트/프로모션 API — 목록 조회, 생성, 상태 변경, 효과 리포트.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/events")
@AdminOnly
@Tag(name = "관리자 이벤트/프로모션")
@SecurityRequirement(name = "bearerAuth")
public class AdminEventController {

    private final AdminEventService adminEventService;

    @GetMapping
    @Operation(summary = "이벤트 목록 조회")
    public ResponseEntity<ApiResponse<Page<EventListResponse>>> getEvents(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String target,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                adminEventService.getEvents(type, status, target, pageable)));
    }

    @PostMapping
    @Operation(summary = "이벤트 생성")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @AdminAction(action = "EVENT_CREATE", targetType = "EVENT")
    public ResponseEntity<ApiResponse<EventListResponse>> createEvent(
            @RequestBody @Valid EventCreateRequest request,
            @AuthenticationPrincipal Long adminId) {
        return ResponseEntity.ok(ApiResponse.created(
                adminEventService.createEvent(request, adminId)));
    }

    @PatchMapping("/{eventId}/status")
    @Operation(summary = "이벤트 상태 변경")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @AdminAction(action = "EVENT_STATUS_CHANGE", targetType = "EVENT", targetIdParam = "eventId")
    public ResponseEntity<ApiResponse<EventStatusResponse>> changeStatus(
            @PathVariable Long eventId,
            @RequestBody @Valid EventStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                adminEventService.changeStatus(eventId, request)));
    }

    @GetMapping("/{eventId}/report")
    @Operation(summary = "이벤트 효과 리포트")
    public ResponseEntity<ApiResponse<EventReportResponse>> getEventReport(
            @PathVariable Long eventId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminEventService.getEventReport(eventId)));
    }
}
