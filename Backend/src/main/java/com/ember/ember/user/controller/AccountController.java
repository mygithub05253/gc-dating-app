package com.ember.ember.user.controller;

import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.report.dto.AppealRequest;
import com.ember.ember.report.dto.AppealResponse;
import com.ember.ember.user.dto.*;
import com.ember.ember.user.service.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Tag(name = "Account", description = "계정 관리 API")
public class AccountController {

    private final AccountService accountService;

    /** 10.1 회원 탈퇴 (30일 유예) */
    @PostMapping("/api/users/me/deactivate")
    @Operation(summary = "회원 탈퇴 (소프트 딜리트, 30일 유예)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"deactivatedAt":"2026-04-30T10:00:00","permanentDeleteAt":"2026-05-30T10:00:00"}}
                """)))
    })
    public ResponseEntity<ApiResponse<DeactivateResponse>> deactivate(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody(required = false) DeactivateRequest request) {
        DeactivateRequest req = (request != null) ? request : new DeactivateRequest(null, null);
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        accountService.deactivate(userDetails.getUserId(), req)));
    }

    /** 10.2 계정 복구 (마이페이지 경로) */
    @PostMapping("/api/users/me/restore")
    @Operation(summary = "탈퇴 유예 계정 복구", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"userId":1,"restoredAt":"2026-04-30T10:00:00","status":"ACTIVE"}}
                """)))
    })
    public ResponseEntity<ApiResponse<RestoreResponse>> restore(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        accountService.restore(userDetails.getUserId())));
    }

    /** 10.3 AI 성격 분석 결과 조회 */
    @GetMapping("/api/users/me/ai-profile")
    @Operation(summary = "AI 성격 분석 결과 조회", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"analysisAvailable":true,"diaryCount":5,"dominantPersonalityTags":["안정 추구","공감 우선"],"dominantEmotionTags":["편안함","그리움"],"dominantLifestyleTags":["미식","혼자 시간"],"dominantToneTags":["솔직한"]}}
                """)))
    })
    public ResponseEntity<ApiResponse<AiProfileResponse>> getAiProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        accountService.getAiProfile(userDetails.getUserId())));
    }

    /** 10.4 제재 이의신청 */
    @PostMapping("/api/users/me/appeals")
    @Operation(summary = "제재 이의신청", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"appealId":1,"status":"PENDING","createdAt":"2026-04-30T10:00:00"}}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "이미 이의신청 존재",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"AP001","message":"이미 처리 중인 이의신청이 있습니다","data":null}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "제재 상태 아님",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"AP002","message":"제재 상태가 아닙니다","data":null}
                """)))
    })
    public ResponseEntity<ApiResponse<AppealResponse>> createAppeal(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody AppealRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(
                        accountService.createAppeal(userDetails.getUserId(), request)));
    }

    /** 10.5 AI 동의 철회 */
    @DeleteMapping("/api/consent")
    @Operation(summary = "AI 분석 동의 철회", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":null}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "동의 내역 없음",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"AC001","message":"AI 분석 동의 내역이 없습니다","data":null}
                """)))
    })
    public ResponseEntity<ApiResponse<Void>> revokeConsent(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletRequest httpRequest) {
        accountService.revokeConsent(userDetails.getUserId(), httpRequest.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success());
    }
}
