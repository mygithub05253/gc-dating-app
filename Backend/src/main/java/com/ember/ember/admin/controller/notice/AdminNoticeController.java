package com.ember.ember.admin.controller.notice;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.notice.AdminNoticeDto.CreateRequest;
import com.ember.ember.admin.dto.notice.AdminNoticeDto.NoticeResponse;
import com.ember.ember.admin.dto.notice.AdminNoticeDto.UpdateRequest;
import com.ember.ember.admin.service.notice.AdminNoticeService;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.notification.domain.Notice;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자 공지사항 API — 관리자 API v2.1 §11.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/notices")
@Tag(name = "Admin Notice", description = "공지사항 관리 (명세 v2.1 §11)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminNoticeController {

    private final AdminNoticeService adminNoticeService;

    @GetMapping
    @Operation(summary = "공지사항 목록 조회")
    public ResponseEntity<ApiResponse<Page<NoticeResponse>>> list(
            @RequestParam(required = false) Notice.NoticeCategory category,
            @RequestParam(required = false) Notice.NoticeStatus status,
            @RequestParam(required = false) Boolean isPinned,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                adminNoticeService.list(category, status, isPinned, page, size)));
    }

    @GetMapping("/{noticeId}")
    @Operation(summary = "공지사항 상세 조회")
    public ResponseEntity<ApiResponse<NoticeResponse>> get(@PathVariable Long noticeId) {
        return ResponseEntity.ok(ApiResponse.success(adminNoticeService.get(noticeId)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "공지사항 생성")
    public ResponseEntity<ApiResponse<NoticeResponse>> create(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody CreateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                adminNoticeService.create(request, principal.getUserId())));
    }

    @PutMapping("/{noticeId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "공지사항 수정")
    public ResponseEntity<ApiResponse<NoticeResponse>> update(
            @PathVariable Long noticeId,
            @Valid @RequestBody UpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                adminNoticeService.update(noticeId, request)));
    }

    @DeleteMapping("/{noticeId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "공지사항 삭제 (소프트)")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long noticeId) {
        adminNoticeService.delete(noticeId);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
