package com.ember.ember.user.controller;

import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.idealtype.dto.IdealTypeRequest;
import com.ember.ember.user.dto.*;
import com.ember.ember.user.service.MyPageService;
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
@Tag(name = "MyPage", description = "마이페이지 API")
public class MyPageController {

    private final MyPageService myPageService;

    /** 11.1 이상형 키워드 조회 */
    @GetMapping("/api/users/me/ideal-type")
    @Operation(summary = "이상형 키워드 조회 (마이페이지)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"keywords":[{"id":1,"text":"안정적인 사람","type":"PERSONALITY"}],"maxSelectable":3,"nextEditableAt":null}}
                """)))
    })
    public ResponseEntity<ApiResponse<IdealTypeDetailResponse>> getIdealType(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        myPageService.getIdealType(userDetails.getUserId())));
    }

    /** 11.2 이상형 키워드 수정 */
    @PutMapping("/api/users/me/ideal-type")
    @Operation(summary = "이상형 키워드 수정 (최대 3개, DELETE-then-INSERT)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"keywords":[{"id":1,"text":"안정적인 사람","type":"PERSONALITY"}],"maxSelectable":3}}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "키워드 초과",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"U004","message":"이상형 키워드는 최대 3개까지 선택할 수 있습니다","data":null}
                """)))
    })
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
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"rooms":[{"roomUuid":"bf48bc80-...","partnerNickname":"미소짓는풍선","status":"COMPLETED","totalDiaryCount":4,"completedAt":"2026-04-29T10:00:00"}],"nextCursor":null,"hasMore":false}}
                """)))
    })
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
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"chatRooms":[{"chatRoomId":1,"partnerNickname":"미소짓는풍선","status":"TERMINATED","endedAt":"2026-04-29T10:00:00"}],"nextCursor":null,"hasMore":false}}
                """)))
    })
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
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"darkMode":false,"language":"ko","ageFilterRange":5}}
                """)))
    })
    public ResponseEntity<ApiResponse<UserSettingResponse>> updateSettings(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody UserSettingRequest request) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        myPageService.updateSettings(userDetails.getUserId(), request)));
    }
}
