package com.ember.ember.admin.controller.account;

import com.ember.ember.admin.annotation.SuperAdminOnly;
import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.admin.dto.*;
import com.ember.ember.admin.service.AdminAccountService;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자 계정 관리 API — 관리자 API 통합명세서 v2.1 §13.1~13.7
 * SUPER_ADMIN 전용.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/admins")
@Validated
@Tag(name = "Admin Account", description = "관리자 계정 관리 API (v2.1 §13.1~13.7, SUPER_ADMIN 전용)")
@SecurityRequirement(name = "bearerAuth")
@SuperAdminOnly
public class AdminAccountController {

    private final AdminAccountService adminAccountService;

    /** §13.1 관리자 계정 목록 조회 */
    @GetMapping
    @Operation(summary = "관리자 계정 목록 조회",
            description = "페이지네이션 + search(이메일/이름) + 역할/상태 필터. DELETED 계정은 제외된다.")
    public ResponseEntity<ApiResponse<Page<AdminAccountListItemResponse>>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) AdminAccount.AdminRole role,
            @RequestParam(required = false) AdminAccount.AdminStatus status,
            @PageableDefault(size = 25, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                adminAccountService.list(search, role, status, pageable)));
    }

    /** §13.4 관리자 이메일 중복 확인 — 경로 충돌 방지를 위해 {adminId} 보다 먼저 선언한다. */
    @GetMapping("/check-email")
    @Operation(summary = "관리자 이메일 중복 확인")
    public ResponseEntity<ApiResponse<AdminEmailAvailabilityResponse>> checkEmail(
            @RequestParam @Email String email) {
        return ResponseEntity.ok(ApiResponse.success(adminAccountService.checkEmail(email)));
    }

    /** §13.7 활성 SUPER_ADMIN 개수 조회 */
    @GetMapping("/count-super-admins")
    @Operation(summary = "활성 SUPER_ADMIN 개수 조회",
            description = "마지막 SUPER_ADMIN 보호 로직의 프런트 측 사전 검증용.")
    public ResponseEntity<ApiResponse<AdminSuperAdminCountResponse>> countSuperAdmins() {
        return ResponseEntity.ok(ApiResponse.success(adminAccountService.countActiveSuperAdmins()));
    }

    /** §13.2 관리자 계정 상세 조회 */
    @GetMapping("/{adminId}")
    @Operation(summary = "관리자 계정 상세 조회")
    public ResponseEntity<ApiResponse<AdminAccountDetailResponse>> getDetail(@PathVariable Long adminId) {
        return ResponseEntity.ok(ApiResponse.success(adminAccountService.getDetail(adminId)));
    }

    /** §13.3 관리자 계정 생성 */
    @PostMapping
    @Operation(summary = "관리자 계정 생성",
            description = "이메일 중복 불가, 비밀번호는 영문 대소문자+숫자+특수문자 조합 8자 이상.")
    public ResponseEntity<ApiResponse<AdminAccountDetailResponse>> create(
            @Valid @RequestBody AdminAccountCreateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminAccountService.create(request)));
    }

    /** §13.5 관리자 계정 수정 */
    @PutMapping("/{adminId}")
    @Operation(summary = "관리자 계정 수정",
            description = "이름·역할·상태 수정. 역할 변경 시 대상 관리자의 RT(Redis) 삭제로 재로그인이 강제된다.")
    public ResponseEntity<ApiResponse<AdminAccountDetailResponse>> update(
            @PathVariable Long adminId,
            @Valid @RequestBody AdminAccountUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminAccountService.update(adminId, request)));
    }

    /** §13.6 관리자 계정 삭제 (소프트) */
    @DeleteMapping("/{adminId}")
    @Operation(summary = "관리자 계정 삭제 (소프트)",
            description = "자기 자신·마지막 SUPER_ADMIN 삭제 불가. 대상의 RT(Redis)를 즉시 삭제한다.")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long adminId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        adminAccountService.softDelete(adminId, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
