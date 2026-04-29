package com.ember.ember.user.controller;

import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.idealtype.dto.IdealTypeRequest;
import com.ember.ember.user.dto.*;
import com.ember.ember.user.service.MyPageService;
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
@Tag(name = "MyPage", description = "마이페이지 API")
public class MyPageController {

    private final MyPageService myPageService;

    /** 11.1 이상형 키워드 조회 */
    @GetMapping("/api/users/me/ideal-type")
    @Operation(summary = "이상형 키워드 조회 (마이페이지)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<IdealTypeDetailResponse>> getIdealType(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        myPageService.getIdealType(userDetails.getUserId())));
    }

    /** 11.2 이상형 키워드 수정 */
    @PutMapping("/api/users/me/ideal-type")
    @Operation(summary = "이상형 키워드 수정 (최대 3개, DELETE-then-INSERT)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<IdealTypeDetailResponse>> updateIdealType(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody IdealTypeRequest request) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        myPageService.updateIdealType(userDetails.getUserId(), request.keywordIds())));
    }

    /** 11.3 교환일기 히스토리 조회 */
    @GetMapping("/api/users/me/history/exchange-rooms")
    @Operation(summary = "교환일기 히스토리 (완료/만료/종료, 커서 페이징)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<ExchangeHistoryResponse>> getExchangeHistory(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) Long cursor,
            @RequestParam(required = false) Integer size) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        myPageService.getExchangeHistory(userDetails.getUserId(), cursor, size)));
    }

    /** 11.4 채팅 히스토리 조회 */
    @GetMapping("/api/users/me/history/chat-rooms")
    @Operation(summary = "채팅 히스토리 (종료된 채팅방, 커서 페이징)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<ChatHistoryResponse>> getChatHistory(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) Long cursor,
            @RequestParam(required = false) Integer size) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        myPageService.getChatHistory(userDetails.getUserId(), cursor, size)));
    }

    /** 11.5 앱 설정 수정 */
    @PatchMapping("/api/users/me/settings")
    @Operation(summary = "앱 설정 수정 (변경할 필드만 전송)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<UserSettingResponse>> updateSettings(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody UserSettingRequest request) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        myPageService.updateSettings(userDetails.getUserId(), request)));
    }
}
