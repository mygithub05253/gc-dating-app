package com.ember.ember.admin.controller.content;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.content.AdminChatMessageResponse;
import com.ember.ember.admin.service.content.AdminChatMessageService;
import com.ember.ember.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자 채팅 메시지 조회 API — §6 콘텐츠 관리.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/chat-messages")
@Tag(name = "Admin Content - Chat Messages", description = "관리자 채팅 메시지 조회")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminChatMessageController {

    private final AdminChatMessageService adminChatMessageService;

    /** 채팅 메시지 목록 조회 (관리자 리뷰용). */
    @GetMapping
    @Operation(summary = "채팅 메시지 조회",
            description = "chatRoomId 또는 userId로 필터링 가능. 최신순.")
    public ResponseEntity<ApiResponse<Page<AdminChatMessageResponse>>> list(
            @RequestParam(required = false) Long chatRoomId,
            @RequestParam(required = false) Long userId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                adminChatMessageService.list(chatRoomId, userId, pageable)));
    }
}
