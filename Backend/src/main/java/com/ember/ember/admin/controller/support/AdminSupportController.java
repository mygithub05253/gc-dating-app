package com.ember.ember.admin.controller.support;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.support.AdminSupportDto.AppealResolveRequest;
import com.ember.ember.admin.dto.support.AdminSupportDto.AppealResponse;
import com.ember.ember.admin.dto.support.AdminSupportDto.InquiryReplyRequest;
import com.ember.ember.admin.dto.support.AdminSupportDto.InquiryResponse;
import com.ember.ember.admin.service.support.AdminSupportService;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.notification.domain.Inquiry;
import com.ember.ember.report.domain.Appeal;
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
 * 관리자 고객지원 API — 관리자 API v2.1 §17.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/support")
@Tag(name = "Admin Support", description = "고객지원 관리 — 문의/이의신청 (명세 v2.1 §17)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminSupportController {

    private final AdminSupportService adminSupportService;

    // ── §17.1 문의 관리 ─────────────────────────────────────

    @GetMapping("/inquiries")
    @Operation(summary = "문의 목록 조회")
    public ResponseEntity<ApiResponse<Page<InquiryResponse>>> listInquiries(
            @RequestParam(required = false) Inquiry.InquiryStatus status,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                adminSupportService.listInquiries(status, category, page, size)));
    }

    @GetMapping("/inquiries/{inquiryId}")
    @Operation(summary = "문의 상세 조회")
    public ResponseEntity<ApiResponse<InquiryResponse>> getInquiry(
            @PathVariable Long inquiryId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminSupportService.getInquiry(inquiryId)));
    }

    @PatchMapping("/inquiries/{inquiryId}/reply")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "문의 답변 등록")
    public ResponseEntity<ApiResponse<InquiryResponse>> replyInquiry(
            @PathVariable Long inquiryId,
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody InquiryReplyRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                adminSupportService.replyInquiry(inquiryId, request, principal.getUserId())));
    }

    @PatchMapping("/inquiries/{inquiryId}/close")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "문의 종료 처리")
    public ResponseEntity<ApiResponse<InquiryResponse>> closeInquiry(
            @PathVariable Long inquiryId,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(ApiResponse.success(
                adminSupportService.closeInquiry(inquiryId, principal.getUserId())));
    }

    // ── §17.2 이의신청 관리 ─────────────────────────────────

    @GetMapping("/appeals")
    @Operation(summary = "이의신청 목록 조회")
    public ResponseEntity<ApiResponse<Page<AppealResponse>>> listAppeals(
            @RequestParam(required = false) Appeal.AppealStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                adminSupportService.listAppeals(status, page, size)));
    }

    @GetMapping("/appeals/{appealId}")
    @Operation(summary = "이의신청 상세 조회")
    public ResponseEntity<ApiResponse<AppealResponse>> getAppeal(
            @PathVariable Long appealId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminSupportService.getAppeal(appealId)));
    }

    @PatchMapping("/appeals/{appealId}/resolve")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "이의신청 결정 처리")
    public ResponseEntity<ApiResponse<AppealResponse>> resolveAppeal(
            @PathVariable Long appealId,
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody AppealResolveRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                adminSupportService.resolveAppeal(appealId, request, principal.getUserId())));
    }
}
