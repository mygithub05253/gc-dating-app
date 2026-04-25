package com.ember.ember.admin.controller.banner;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.banner.AdminBannerDto.BannerResponse;
import com.ember.ember.admin.dto.banner.AdminBannerDto.CreateRequest;
import com.ember.ember.admin.dto.banner.AdminBannerDto.UpdateRequest;
import com.ember.ember.admin.service.banner.AdminBannerService;
import com.ember.ember.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자 배너 API — 관리자 API v2.1 §12.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/banners")
@Tag(name = "Admin Banner", description = "배너 관리 (명세 v2.1 §12)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminBannerController {

    private final AdminBannerService adminBannerService;

    @GetMapping
    @Operation(summary = "배너 목록 조회")
    public ResponseEntity<ApiResponse<Page<BannerResponse>>> list(
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                adminBannerService.list(isActive, page, size)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "배너 생성")
    public ResponseEntity<ApiResponse<BannerResponse>> create(
            @Valid @RequestBody CreateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminBannerService.create(request)));
    }

    @PutMapping("/{bannerId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "배너 수정")
    public ResponseEntity<ApiResponse<BannerResponse>> update(
            @PathVariable Long bannerId,
            @Valid @RequestBody UpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                adminBannerService.update(bannerId, request)));
    }

    @DeleteMapping("/{bannerId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "배너 삭제")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long bannerId) {
        adminBannerService.delete(bannerId);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
