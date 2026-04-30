package com.ember.ember.chat.controller;

import com.ember.ember.chat.dto.*;
import com.ember.ember.chat.service.ChatService;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
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

/**
 * 채팅 REST 컨트롤러 (도메인 7)
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Chat", description = "채팅 API")
public class ChatController {

    private final ChatService chatService;

    /** 6.1 채팅 시작 (교환일기 → 채팅방 생성) */
    @PostMapping("/api/exchange-rooms/{roomId}/chat")
    @Operation(summary = "채팅방 생성 (교환일기 완료 후)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "생성 성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"201","message":"CREATED","data":{"chatRoomId":1}}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "이미 생성됨",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"CR008","message":"이미 채팅방이 생성되었습니다","data":null}
                """)))
    })
    public ResponseEntity<ApiResponse<ChatRoomListResponse.ChatRoomItem>> createChatRoom(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long roomId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                chatService.createChatRoom(userDetails.getUserId(), roomId)));
    }

    /** 6.2 채팅방 목록 조회 */
    @GetMapping("/api/chat-rooms")
    @Operation(summary = "채팅방 목록 조회", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"chatRooms":[{"chatRoomId":1,"partnerNickname":"미소짓는풍선","status":"ACTIVE","lastMessage":"안녕하세요!","lastMessageAt":"2026-04-30T10:00:00","unreadCount":2}]}}
                """)))
    })
    public ResponseEntity<ApiResponse<ChatRoomListResponse>> getChatRooms(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                chatService.getChatRooms(userDetails.getUserId())));
    }

    /** 6.3 메시지 이력 조회 */
    @GetMapping("/api/chat-rooms/{roomId}/messages")
    @Operation(summary = "메시지 이력 조회 (커서 기반)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"messages":[{"messageId":1,"content":"안녕하세요!","senderNickname":"열정적인눈꽃","type":"TEXT","sentAt":"2026-04-30T10:00:00","sequenceId":1}],"nextCursor":null,"hasMore":false}}
                """)))
    })
    public ResponseEntity<ApiResponse<ChatMessageListResponse>> getMessages(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long roomId,
            @RequestParam(required = false) Long before,
            @RequestParam(required = false) Integer size) {
        return ResponseEntity.ok(ApiResponse.success(
                chatService.getMessages(userDetails.getUserId(), roomId, before, size)));
    }

    /** 6.4 채팅 상대방 프로필 조회 */
    @GetMapping("/api/chat-rooms/{roomId}/profile")
    @Operation(summary = "채팅 상대방 프로필 조회", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"userId":2,"nickname":"미소짓는풍선","gender":"FEMALE","ageGroup":"20대","personalityTags":["안정 추구","공감 우선"]}}
                """)))
    })
    public ResponseEntity<ApiResponse<ChatPartnerProfileResponse>> getPartnerProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long roomId) {
        return ResponseEntity.ok(ApiResponse.success(
                chatService.getPartnerProfile(userDetails.getUserId(), roomId)));
    }

    /** 6.5 메시지 전송 (REST, 테스트용 — 프로덕션은 WebSocket) */
    @PostMapping("/api/chat-rooms/{roomId}/messages")
    @Operation(summary = "메시지 전송 (REST)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"messageId":5,"sequenceId":5,"sentAt":"2026-04-30T10:00:00"}}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "금칙어 포함",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"SC001","message":"금칙어가 포함되어 있습니다","data":null}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "채팅방 접근 불가",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"CR007","message":"채팅방에 접근할 수 없습니다","data":null}
                """)))
    })
    public ResponseEntity<ApiResponse<com.ember.ember.chat.dto.ChatMessageResponse>> sendMessage(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long roomId,
            @RequestBody com.ember.ember.chat.dto.ChatMessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                chatService.sendMessage(userDetails.getUserId(), roomId, request)));
    }

    /** 6.6 채팅방 나가기 */
    @PostMapping("/api/chat-rooms/{roomId}/leave")
    @Operation(summary = "채팅방 나가기", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":null}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "채팅방 없음",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"CR002","message":"채팅방을 찾을 수 없습니다","data":null}
                """)))
    })
    public ResponseEntity<ApiResponse<Void>> leaveChatRoom(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long roomId) {
        chatService.leaveChatRoom(userDetails.getUserId(), roomId);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
