package com.ember.ember.notification.controller;

import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.notification.dto.*;
import com.ember.ember.notification.service.NoticeSupportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":[{"noticeId":1,"title":"서비스 업데이트","category":"SERVICE","isPinned":true,"createdAt":"2026-04-30T10:00:00"}]}
                """)))
    })
    public ResponseEntity<ApiResponse<List<NoticeResponse>>> getNotices() {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(noticeSupportService.getNotices()));
    }

    /** 15.2 공지사항 상세 조회 */
    @GetMapping("/api/notices/{noticeId}")
    @Operation(summary = "공지사항 상세 조회")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"noticeId":1,"title":"서비스 업데이트","content":"업데이트 내용...","category":"SERVICE","createdAt":"2026-04-30T10:00:00"}}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "공지 없음",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"NT001","message":"공지사항을 찾을 수 없습니다","data":null}
                """)))
    })
    public ResponseEntity<ApiResponse<NoticeDetailResponse>> getNoticeDetail(
            @PathVariable Long noticeId) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(noticeSupportService.getNoticeDetail(noticeId)));
    }

    /** 15.3 활성 배너 조회 */
    @GetMapping("/api/notices/banners")
    @Operation(summary = "활성 배너 조회 (최대 5개)")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":[{"id":1,"title":"이벤트 배너","imageUrl":"https://...","linkType":"NONE","linkUrl":null}]}
                """)))
    })
    public ResponseEntity<ApiResponse<List<BannerResponse>>> getActiveBanners() {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(noticeSupportService.getActiveBanners()));
    }

    /** 15.4 미읽음 공지 수 조회 */
    @GetMapping("/api/notices/unread-count")
    @Operation(summary = "미읽음 공지사항 수 조회", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":5}
                """)))
    })
    public ResponseEntity<ApiResponse<Integer>> getUnreadCount(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        noticeSupportService.getUnreadNoticeCount(userDetails.getUserId())));
    }

    /** 16.1 FAQ 조회 */
    @GetMapping("/api/faq")
    @Operation(summary = "FAQ 목록 조회")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":[{"faqId":1,"question":"교환일기는 어떻게 시작하나요?","answer":"일기를 작성하고...","category":"SERVICE"}]}
                """)))
    })
    public ResponseEntity<ApiResponse<List<FaqResponse>>> getFaqs() {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(noticeSupportService.getFaqs()));
    }

    /** 16.2 1:1 문의 접수 */
    @PostMapping("/api/support/inquiry")
    @Operation(summary = "1:1 문의 접수", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"inquiryId":1,"createdAt":"2026-04-30T10:00:00"}}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "429", description = "문의 제한 초과",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"SP001","message":"문의는 최대 5건까지 접수할 수 있습니다","data":null}
                """)))
    })
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
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":[{"inquiryId":1,"category":"기능 문의","title":"테스트 문의","status":"PENDING","createdAt":"2026-04-30T10:00:00"}]}
                """)))
    })
    public ResponseEntity<ApiResponse<List<InquiryResponse>>> getMyInquiries(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        noticeSupportService.getMyInquiries(userDetails.getUserId())));
    }

    /** 16.4 문의 상세 조회 */
    @GetMapping("/api/support/inquiries/{inquiryId}")
    @Operation(summary = "문의 상세 조회", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"inquiryId":1,"category":"기능 문의","title":"테스트 문의","content":"문의 내용...","answer":null,"status":"PENDING"}}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "문의 없음",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"SP003","message":"문의를 찾을 수 없습니다","data":null}
                """)))
    })
    public ResponseEntity<ApiResponse<InquiryResponse>> getInquiryDetail(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long inquiryId) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        noticeSupportService.getInquiryDetail(userDetails.getUserId(), inquiryId)));
    }
}
