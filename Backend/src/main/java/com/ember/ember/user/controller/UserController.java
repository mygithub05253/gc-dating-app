package com.ember.ember.user.controller;

import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.user.dto.*;
import com.ember.ember.user.service.UserService;
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

@RestController
@RequiredArgsConstructor
@Tag(name = "User", description = "사용자 프로필 API")
public class UserController {

    private final UserService userService;

    /** 랜덤 닉네임 생성 */
    @PostMapping("/api/users/nickname/generate")
    @Operation(summary = "랜덤 닉네임 생성 (형용사+명사 조합)")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"201","message":"CREATED","data":{"nickname":"따뜻한별빛"}}
                """)))
    })
    public ResponseEntity<ApiResponse<NicknameGenerateResponse>> generateNickname() {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(userService.generateNickname()));
    }

    /** 프로필 등록 (온보딩 1단계) */
    @PostMapping("/api/users/profile")
    @Operation(summary = "프로필 등록 (온보딩 1단계)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"201","message":"CREATED","data":{"userId":1,"nickname":"따뜻한별빛","onboardingStep":1}}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "닉네임 중복",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"U001","message":"이미 사용 중인 닉네임입니다.","data":null}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "미성년자",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"U002","message":"만 18세 이상만 가입할 수 있습니다.","data":null}
                """)))
    })
    public ResponseEntity<ApiResponse<ProfileResponse>> createProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ProfileRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(userService.createProfile(userDetails.getUserId(), request)));
    }

    /** 내 프로필 조회 */
    @GetMapping("/api/users/me")
    @Operation(summary = "내 프로필 조회", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"userId":1,"nickname":"따뜻한별빛","birthDate":"2000-01-01","gender":"MALE","sido":"서울특별시","sigungu":"강남구","onboardingCompleted":true,"onboardingStep":2,"accountStatus":"ACTIVE"}}
                """)))
    })
    public ResponseEntity<ApiResponse<UserMeResponse>> getMyProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(userService.getMyProfile(userDetails.getUserId())));
    }

    /** 프로필 부분 수정 */
    @PatchMapping("/api/users/me/profile")
    @Operation(summary = "프로필 부분 수정 (닉네임/지역/학교)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"userId":1,"nickname":"새닉네임"}}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "429", description = "닉네임 변경 쿨다운",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"U006","message":"닉네임은 30일에 한 번만 변경할 수 있습니다.","data":null}
                """)))
    })
    public ResponseEntity<ApiResponse<Void>> updateProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ProfileUpdateRequest request) {
        userService.updateProfile(userDetails.getUserId(), request);
        return ResponseEntity.status(HttpStatus.OK).body(ApiResponse.success());
    }

    /** FCM 디바이스 토큰 등록/갱신 */
    @PostMapping("/api/users/me/fcm-token")
    @Operation(summary = "FCM 토큰 등록/갱신", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":null}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "잘못된 요청",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"C001","message":"잘못된 요청입니다.","data":null}
                """)))
    })
    public ResponseEntity<ApiResponse<Void>> registerFcmToken(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody FcmTokenRequest request) {
        userService.registerFcmToken(userDetails.getUserId(), request);
        return ResponseEntity.status(HttpStatus.OK).body(ApiResponse.success());
    }
}
