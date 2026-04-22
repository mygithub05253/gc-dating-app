package com.ember.ember.admin.controller.auth;

import com.ember.ember.admin.dto.*;
import com.ember.ember.admin.service.AdminAuthService;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자 인증 API
 * 명세: 관리자 API 통합명세서 v2.1 §1.1~1.5
 *       (v2.2 기준 §1은 v2.1이 베이스, 에러코드 A020/A021/A022 적용)
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/auth")
@Tag(name = "Admin Auth", description = "관리자 인증 API (관리자 API 통합명세서 v2.1 §1)")
public class AdminAuthController {

    private static final String BEARER_PREFIX = "Bearer ";

    private final AdminAuthService adminAuthService;

    /** 관리자 로그인 — §1.1 */
    @PostMapping("/login")
    @Operation(summary = "관리자 로그인", description = "이메일/비밀번호 검증 후 JWT(AT 30분, RT 7일)를 발급한다.")
    public ResponseEntity<ApiResponse<AdminTokenResponse>> login(
            @Valid @RequestBody AdminLoginRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ApiResponse.success(adminAuthService.login(request, httpRequest)));
    }

    /** AccessToken 재발급 — §1.2 */
    @PostMapping("/refresh")
    @Operation(summary = "AccessToken 재발급",
            description = "유효한 refreshToken을 검증해 새 accessToken(30분)을 발급한다. RT는 그대로 유지된다.")
    public ResponseEntity<ApiResponse<AdminAccessTokenResponse>> refresh(
            @Valid @RequestBody AdminRefreshRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminAuthService.refresh(request)));
    }

    /** 관리자 로그아웃 — §1.3 */
    @PostMapping("/logout")
    @Operation(summary = "관리자 로그아웃", description = "AT를 블랙리스트에 등록하고 RT를 삭제한다.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest httpRequest) {
        String accessToken = resolveToken(httpRequest);
        adminAuthService.logout(accessToken, httpRequest);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /** 비밀번호 변경 — §1.4 */
    @PutMapping("/password")
    @Operation(summary = "비밀번호 변경",
            description = "현재 비밀번호 확인 후 새 비밀번호(강도 조합)로 변경한다. 기본적으로 다른 세션은 로그아웃된다.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<AdminPasswordChangeResponse>> changePassword(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody AdminPasswordChangeRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ApiResponse.success(
                adminAuthService.changePassword(userDetails.getUserId(), request, httpRequest)));
    }

    /** 현재 관리자 정보 조회 — §1.5 */
    @GetMapping("/me")
    @Operation(summary = "현재 관리자 정보 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<AdminMeResponse>> me(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(adminAuthService.getMe(userDetails.getUserId())));
    }

    /** Authorization 헤더에서 Bearer 토큰 추출 */
    private String resolveToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (bearer != null && bearer.startsWith(BEARER_PREFIX)) {
            return bearer.substring(BEARER_PREFIX.length());
        }
        return null;
    }
}
