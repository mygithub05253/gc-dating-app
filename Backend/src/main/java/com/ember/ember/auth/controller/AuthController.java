package com.ember.ember.auth.controller;

import com.ember.ember.auth.dto.*;
import com.ember.ember.auth.service.AuthService;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
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
    @Operation(summary = "소셜 로그인/회원가입", description = "카카오 소셜 로그인/회원가입. 카카오 accessToken으로 JWT 발급. 신규 유저는 ROLE_GUEST로 자동 생성.",
        responses = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "성공",
                content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                    {"code":"201","message":"CREATED","data":{"accessToken":"eyJ...","refreshToken":"eyJ...","userId":1,"isNewUser":true,"role":"ROLE_GUEST"}}
                    """))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "소셜 인증 실패",
                content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                    {"code":"A009","message":"소셜 인증에 실패했습니다.","data":null}
                    """)))
        })
    public ResponseEntity<ApiResponse<SocialLoginResponse>> socialLogin(
            @Valid @RequestBody SocialLoginRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(authService.socialLogin(request)));
    }

    /** 토큰 갱신 */
    @PostMapping("/api/auth/refresh")
    @Operation(summary = "토큰 갱신 (Refresh Token Rotation)")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"accessToken":"eyJ...","refreshToken":"eyJ..."}}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "유효하지 않은 리프레시 토큰",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"A005","message":"유효하지 않은 리프레시 토큰입니다.","data":null}
                """)))
    })
    public ResponseEntity<ApiResponse<TokenResponse>> refreshToken(
            @Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(authService.refreshToken(request)));
    }

    /** 로그아웃 */
    @PostMapping("/api/auth/logout")
    @Operation(summary = "로그아웃", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":null}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "만료된 토큰",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"A002","message":"만료된 토큰입니다.","data":null}
                """)))
    })
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
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"userId":1,"restoredAt":"2026-04-30T10:00:00","status":"ACTIVE"}}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "복구 불가",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"A012","message":"복구할 수 없는 계정입니다.","data":null}
                """)))
    })
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
