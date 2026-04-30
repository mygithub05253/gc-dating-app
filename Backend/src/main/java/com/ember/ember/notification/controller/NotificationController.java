package com.ember.ember.notification.controller;

import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.notification.dto.*;
import com.ember.ember.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Tag(name = "Notification", description = "알림 API")
public class NotificationController {

    private final NotificationService notificationService;

    /** 9.1 알림 목록 조회 */
    @GetMapping("/api/notifications")
    @Operation(summary = "알림 목록 조회 (최근 30일)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"notifications":[{"notificationId":1,"type":"MATCHING_REQUEST","title":"매칭 요청","body":"미소짓는풍선님이 교환을 신청했어요","isRead":false,"createdAt":"2026-04-30T10:00:00"}]}}
                """)))
    })
    public ResponseEntity<ApiResponse<NotificationListResponse>> getNotifications(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        notificationService.getNotifications(userDetails.getUserId())));
    }

    /** 9.2 특정 알림 읽음 처리 */
    @PatchMapping("/api/notifications/{notificationId}/read")
    @Operation(summary = "알림 읽음 처리", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":null}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "알림 없음",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"N001","message":"알림을 찾을 수 없습니다","data":null}
                """)))
    })
    public ResponseEntity<ApiResponse<NotificationReadResponse>> markAsRead(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long notificationId) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        notificationService.markAsRead(userDetails.getUserId(), notificationId)));
    }

    /** 9.3 전체 알림 읽음 처리 */
    @PatchMapping("/api/notifications/read-all")
    @Operation(summary = "전체 알림 읽음 처리", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"updatedCount":3,"readAt":"2026-04-30T10:00:00"}}
                """)))
    })
    public ResponseEntity<ApiResponse<ReadAllResponse>> markAllAsRead(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        notificationService.markAllAsRead(userDetails.getUserId())));
    }

    /** 9.4 알림 설정 조회 */
    @GetMapping("/api/users/me/notification-settings")
    @Operation(summary = "알림 설정 조회", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"matching":true,"diaryTurn":true,"chat":true,"aiAnalysis":true,"couple":true,"system":true}}
                """)))
    })
    public ResponseEntity<ApiResponse<NotificationSettingResponse>> getSettings(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        notificationService.getNotificationSettings(userDetails.getUserId())));
    }

    /** 9.5 알림 설정 수정 */
    @PatchMapping("/api/users/me/notification-settings")
    @Operation(summary = "알림 설정 수정 (변경할 필드만 전송)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"matching":true,"diaryTurn":true,"chat":true,"aiAnalysis":true,"couple":true,"system":true}}
                """)))
    })
    public ResponseEntity<ApiResponse<NotificationSettingResponse>> updateSettings(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody NotificationSettingRequest request) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        notificationService.updateNotificationSettings(userDetails.getUserId(), request)));
    }
}
