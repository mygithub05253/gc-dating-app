package com.ember.ember.auth.controller;

import com.ember.ember.auth.dto.*;
import com.ember.ember.auth.service.AuthService;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@Tag(name = "Auth", description = "인증 API")
public class AuthController {

    private final AuthService authService;

    /** 소셜 로그인/회원가입 */
    @PostMapping("/api/auth/social")
    @Operation(summary = "소셜 로그인/회원가입")
    public ResponseEntity<ApiResponse<SocialLoginResponse>> socialLogin(
            @Valid @RequestBody SocialLoginRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(authService.socialLogin(request)));
    }

    /** 토큰 갱신 */
    @PostMapping("/api/auth/refresh")
    @Operation(summary = "토큰 갱신 (Refresh Token Rotation)")
    public ResponseEntity<ApiResponse<TokenResponse>> refreshToken(
            @Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(authService.refreshToken(request)));
    }

    /** 로그아웃 */
    @PostMapping("/api/auth/logout")
    @Operation(summary = "로그아웃", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> logout(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletRequest request) {
        String accessToken = resolveToken(request);
        authService.logout(userDetails.getUserId(), accessToken);
        return ResponseEntity.status(HttpStatus.OK).body(ApiResponse.success());
    }

    /** 계정 복구 (탈퇴 유예 기간 내) */
    @PostMapping("/api/auth/restore")
    @Operation(summary = "탈퇴 유예 계정 복구")
    public ResponseEntity<ApiResponse<RestoreResponse>> restoreAccount(
            @Valid @RequestBody RestoreRequest request) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(authService.restoreAccount(request)));
    }

    /** Authorization 헤더에서 Bearer 토큰 추출 */
    private String resolveToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (bearer != null && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }
}
