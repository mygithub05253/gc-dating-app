package com.ember.ember.admin.controller.user;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.member.AdminMemberReleaseRequest;
import com.ember.ember.admin.dto.member.AdminMemberReleaseResponse;
import com.ember.ember.admin.service.AdminMemberService;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * 회원 제재 해제 API — 관리자 API 통합명세서 v2.1 §3.5.
 * 경로가 {@code /api/admin/users/...} 로 단일 엔드포인트만 존재하므로 별도 컨트롤러로 분리한다.
 * BANNED 해제는 서비스 레이어에서 SUPER_ADMIN 가드(ADM016)를 수행한다.
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Admin Member Release", description = "회원 제재 해제 API (v2.1 §3.5)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminMemberReleaseController {

    private final AdminMemberService adminMemberService;

    @PostMapping("/api/admin/users/{userId}/suspension/release")
    @Operation(summary = "회원 제재 해제",
            description = "SUSPEND_7D/SUSPEND_30D 는 ADMIN+, BANNED 는 SUPER_ADMIN 전용. 해제 시 UNBLOCK 이력 추가.")
    public ResponseEntity<ApiResponse<AdminMemberReleaseResponse>> release(
            @PathVariable Long userId,
            @Valid @RequestBody AdminMemberReleaseRequest request,
            @AuthenticationPrincipal CustomUserDetails admin) {
        return ResponseEntity.ok(ApiResponse.success(
                adminMemberService.releaseSanction(userId, request, admin)));
    }
}
