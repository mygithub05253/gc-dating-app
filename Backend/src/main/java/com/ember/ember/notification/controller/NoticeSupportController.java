package com.ember.ember.notification.controller;

import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.notification.dto.*;
import com.ember.ember.notification.service.NoticeSupportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Notice/Support", description = "공지사항/FAQ/고객지원 API")
public class NoticeSupportController {

    private final NoticeSupportService noticeSupportService;

    /** 15.1 공지사항 목록 조회 */
    @GetMapping("/api/notices")
    @Operation(summary = "공지사항 목록 조회")
    public ResponseEntity<ApiResponse<List<NoticeResponse>>> getNotices() {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(noticeSupportService.getNotices()));
    }

    /** 15.2 공지사항 상세 조회 */
    @GetMapping("/api/notices/{noticeId}")
    @Operation(summary = "공지사항 상세 조회")
    public ResponseEntity<ApiResponse<NoticeDetailResponse>> getNoticeDetail(
            @PathVariable Long noticeId) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(noticeSupportService.getNoticeDetail(noticeId)));
    }

    /** 15.3 활성 배너 조회 */
    @GetMapping("/api/notices/banners")
    @Operation(summary = "활성 배너 조회 (최대 5개)")
    public ResponseEntity<ApiResponse<List<BannerResponse>>> getActiveBanners() {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(noticeSupportService.getActiveBanners()));
    }

    /** 15.4 미읽음 공지 수 조회 */
    @GetMapping("/api/notices/unread-count")
    @Operation(summary = "미읽음 공지사항 수 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Integer>> getUnreadCount(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        noticeSupportService.getUnreadNoticeCount(userDetails.getUserId())));
    }

    /** 16.1 FAQ 조회 */
    @GetMapping("/api/faq")
    @Operation(summary = "FAQ 목록 조회")
    public ResponseEntity<ApiResponse<List<FaqResponse>>> getFaqs() {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(noticeSupportService.getFaqs()));
    }

    /** 16.2 1:1 문의 접수 */
    @PostMapping("/api/support/inquiry")
    @Operation(summary = "1:1 문의 접수", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<InquiryResponse>> createInquiry(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody InquiryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(
                        noticeSupportService.createInquiry(userDetails.getUserId(), request)));
    }

    /** 16.3 내 문의 목록 조회 */
    @GetMapping("/api/support/inquiries")
    @Operation(summary = "내 문의 목록 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<List<InquiryResponse>>> getMyInquiries(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        noticeSupportService.getMyInquiries(userDetails.getUserId())));
    }

    /** 16.4 문의 상세 조회 */
    @GetMapping("/api/support/inquiries/{inquiryId}")
    @Operation(summary = "문의 상세 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<InquiryResponse>> getInquiryDetail(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long inquiryId) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        noticeSupportService.getInquiryDetail(userDetails.getUserId(), inquiryId)));
    }
}
