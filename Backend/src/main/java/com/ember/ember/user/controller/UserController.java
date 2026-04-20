package com.ember.ember.user.controller;

import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.user.dto.*;
import com.ember.ember.user.service.UserService;
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
@Tag(name = "User", description = "사용자 프로필 API")
public class UserController {

    private final UserService userService;

    /** 랜덤 닉네임 생성 */
    @PostMapping("/api/users/nickname/generate")
    @Operation(summary = "랜덤 닉네임 생성 (형용사+명사 조합)")
    public ResponseEntity<ApiResponse<NicknameGenerateResponse>> generateNickname() {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(userService.generateNickname()));
    }

    /** 프로필 등록 (온보딩 1단계) */
    @PostMapping("/api/users/profile")
    @Operation(summary = "프로필 등록 (온보딩 1단계)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<ProfileResponse>> createProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ProfileRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(userService.createProfile(userDetails.getUserId(), request)));
    }

    /** 내 프로필 조회 */
    @GetMapping("/api/users/me")
    @Operation(summary = "내 프로필 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<UserMeResponse>> getMyProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(userService.getMyProfile(userDetails.getUserId())));
    }

    /** 프로필 부분 수정 */
    @PatchMapping("/api/users/me/profile")
    @Operation(summary = "프로필 부분 수정 (닉네임/지역/학교)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> updateProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ProfileUpdateRequest request) {
        userService.updateProfile(userDetails.getUserId(), request);
        return ResponseEntity.status(HttpStatus.OK).body(ApiResponse.success());
    }

    /** FCM 디바이스 토큰 등록/갱신 */
    @PostMapping("/api/users/me/fcm-token")
    @Operation(summary = "FCM 토큰 등록/갱신", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> registerFcmToken(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody FcmTokenRequest request) {
        userService.registerFcmToken(userDetails.getUserId(), request);
        return ResponseEntity.status(HttpStatus.OK).body(ApiResponse.success());
    }
}
