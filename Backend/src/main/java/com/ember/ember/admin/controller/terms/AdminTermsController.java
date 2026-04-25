package com.ember.ember.admin.controller.terms;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.domain.terms.Terms;
import com.ember.ember.admin.dto.terms.AdminTermsDto.CreateRequest;
import com.ember.ember.admin.dto.terms.AdminTermsDto.TermsResponse;
import com.ember.ember.admin.dto.terms.AdminTermsDto.UpdateRequest;
import com.ember.ember.admin.service.terms.AdminTermsService;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자 약관 API — 관리자 API v2.1 §10.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/terms")
@Tag(name = "Admin Terms", description = "약관 관리 (명세 v2.1 §10)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminTermsController {

    private final AdminTermsService adminTermsService;

    @GetMapping
    @Operation(summary = "약관 목록 조회")
    public ResponseEntity<ApiResponse<Page<TermsResponse>>> list(
            @RequestParam(required = false) Terms.TermsType type,
            @RequestParam(required = false) Terms.TermsStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                adminTermsService.list(type, status, page, size)));
    }

    @GetMapping("/{termsId}")
    @Operation(summary = "약관 상세 조회")
    public ResponseEntity<ApiResponse<TermsResponse>> get(@PathVariable Long termsId) {
        return ResponseEntity.ok(ApiResponse.success(adminTermsService.get(termsId)));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "약관 생성 (SUPER_ADMIN)")
    public ResponseEntity<ApiResponse<TermsResponse>> create(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody CreateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                adminTermsService.create(request, principal.getUserId())));
    }

    @PutMapping("/{termsId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "약관 수정/버전업 (SUPER_ADMIN)")
    public ResponseEntity<ApiResponse<TermsResponse>> update(
            @PathVariable Long termsId,
            @Valid @RequestBody UpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                adminTermsService.update(termsId, request)));
    }

    @DeleteMapping("/{termsId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "약관 아카이브 (SUPER_ADMIN)")
    public ResponseEntity<ApiResponse<Void>> archive(@PathVariable Long termsId) {
        adminTermsService.archive(termsId);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
