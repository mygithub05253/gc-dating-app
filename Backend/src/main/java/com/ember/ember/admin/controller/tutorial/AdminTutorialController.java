package com.ember.ember.admin.controller.tutorial;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.tutorial.AdminTutorialDto.CreateRequest;
import com.ember.ember.admin.dto.tutorial.AdminTutorialDto.ReorderRequest;
import com.ember.ember.admin.dto.tutorial.AdminTutorialDto.TutorialResponse;
import com.ember.ember.admin.dto.tutorial.AdminTutorialDto.UpdateRequest;
import com.ember.ember.admin.service.tutorial.AdminTutorialService;
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
 * 관리자 튜토리얼 API — 관리자 API v2.1 §23.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/tutorials/pages")
@Tag(name = "Admin Tutorial", description = "튜토리얼 페이지 관리 (명세 v2.1 §23)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminTutorialController {

    private final AdminTutorialService adminTutorialService;

    @GetMapping
    @Operation(summary = "튜토리얼 페이지 목록 조회")
    public ResponseEntity<ApiResponse<Page<TutorialResponse>>> list(
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                adminTutorialService.list(isActive, page, size)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "튜토리얼 페이지 생성")
    public ResponseEntity<ApiResponse<TutorialResponse>> create(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody CreateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                adminTutorialService.create(request, principal.getUserId())));
    }

    @PutMapping("/{pageId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "튜토리얼 페이지 수정")
    public ResponseEntity<ApiResponse<TutorialResponse>> update(
            @PathVariable Long pageId,
            @Valid @RequestBody UpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                adminTutorialService.update(pageId, request)));
    }

    @DeleteMapping("/{pageId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "튜토리얼 페이지 삭제")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long pageId) {
        adminTutorialService.delete(pageId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/reorder")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "튜토리얼 페이지 순서 변경")
    public ResponseEntity<ApiResponse<Void>> reorder(
            @Valid @RequestBody ReorderRequest request) {
        adminTutorialService.reorder(request);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
