package com.ember.ember.admin.controller.user;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.member.*;
import com.ember.ember.admin.service.AdminMemberService;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.user.domain.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 관리자 회원 관리 API — 관리자 API 통합명세서 v2.1 §3.
 * 전 메서드 ADMIN 이상 공통 가드. 정지/해제는 명세 기준 ADMIN+ 허용이며,
 * BANNED 해제만 Service 내부에서 SUPER_ADMIN 검증한다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/members")
@Tag(name = "Admin Members", description = "관리자 회원 관리 API (v2.1 §3)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminMemberController {

    private final AdminMemberService adminMemberService;

    /** §3.1 회원 목록 */
    @GetMapping
    @Operation(summary = "회원 목록 조회",
            description = "키워드(이메일/닉네임/실명) + 상태 + 성별 필터. 목록의 이메일은 항상 마스킹 처리된다.")
    public ResponseEntity<ApiResponse<Page<AdminMemberListItemResponse>>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) User.UserStatus status,
            @RequestParam(required = false) User.Gender gender,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(adminMemberService.list(keyword, status, gender, pageable)));
    }

    /** §3.2 회원 상세 — ADMIN+ 는 PII 접근 로그 기록 후 이메일 전체 반환 */
    @GetMapping("/{userId}")
    @Operation(summary = "회원 상세 조회",
            description = "ADMIN 이상 권한자는 이메일 전체 조회(admin_pii_access_log 기록), VIEWER 는 마스킹된 이메일.")
    public ResponseEntity<ApiResponse<AdminMemberDetailResponse>> getDetail(
            @PathVariable Long userId,
            @AuthenticationPrincipal CustomUserDetails admin) {
        AdminMemberDetailResponse body = (admin.getRole() != null && admin.getRole().contains("ADMIN"))
                ? adminMemberService.getDetailWithFullEmail(userId)
                : adminMemberService.getDetailMasked(userId);
        return ResponseEntity.ok(ApiResponse.success(body));
    }

    /** §3.3 7일 정지 */
    @PostMapping("/{userId}/suspend")
    @Operation(summary = "회원 7일 정지",
            description = "상태=SUSPEND_7D, 해제 예정일=+7일. 사용자 Refresh Token 즉시 삭제.")
    public ResponseEntity<ApiResponse<Void>> suspend7d(
            @PathVariable Long userId,
            @Valid @RequestBody AdminMemberSuspendRequest request,
            @AuthenticationPrincipal CustomUserDetails admin) {
        adminMemberService.suspendFor7Days(userId, request.reason(), admin);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /** §3.4 영구 정지 */
    @PostMapping("/{userId}/ban")
    @Operation(summary = "회원 영구 정지",
            description = "상태=BANNED. 사용자 Refresh Token 즉시 삭제. AccessToken 블랙리스트 등록은 Phase B.")
    public ResponseEntity<ApiResponse<Void>> banPermanent(
            @PathVariable Long userId,
            @Valid @RequestBody AdminMemberSuspendRequest request,
            @AuthenticationPrincipal CustomUserDetails admin) {
        adminMemberService.banPermanently(userId, request.reason(), admin);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /** §3.7 제재 이력 */
    @GetMapping("/{userId}/sanctions")
    @Operation(summary = "회원 제재 이력 조회",
            description = "startedAt 내림차순. admin 프록시 JOIN FETCH로 N+1 회피.")
    public ResponseEntity<ApiResponse<List<AdminSanctionHistoryItemResponse>>> sanctions(
            @PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.success(adminMemberService.getSanctionHistory(userId)));
    }

    /** §3.9 활동 요약 */
    @GetMapping("/{userId}/activity-summary")
    @Operation(summary = "회원 활동 요약",
            description = "총 일기 수 / 활성 매칭 수 / 마지막 로그인. activeDays 집계는 Phase B.")
    public ResponseEntity<ApiResponse<AdminMemberActivitySummaryResponse>> activitySummary(
            @PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.success(adminMemberService.getActivitySummary(userId)));
    }
}
