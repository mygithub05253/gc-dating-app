package com.ember.ember.admin.controller.faq;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.faq.AdminFaqDto.CreateRequest;
import com.ember.ember.admin.dto.faq.AdminFaqDto.FaqResponse;
import com.ember.ember.admin.dto.faq.AdminFaqDto.ReorderRequest;
import com.ember.ember.admin.dto.faq.AdminFaqDto.UpdateRequest;
import com.ember.ember.admin.service.faq.AdminFaqService;
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
 * 관리자 FAQ API — 관리자 API v2.1 §22.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/faqs")
@Tag(name = "Admin FAQ", description = "FAQ 관리 (명세 v2.1 §22)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminFaqController {

    private final AdminFaqService adminFaqService;

    @GetMapping
    @Operation(summary = "FAQ 목록 조회")
    public ResponseEntity<ApiResponse<Page<FaqResponse>>> list(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                adminFaqService.list(category, isActive, page, size)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "FAQ 생성")
    public ResponseEntity<ApiResponse<FaqResponse>> create(
            @Valid @RequestBody CreateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminFaqService.create(request)));
    }

    @PutMapping("/{faqId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "FAQ 수정")
    public ResponseEntity<ApiResponse<FaqResponse>> update(
            @PathVariable Long faqId,
            @Valid @RequestBody UpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminFaqService.update(faqId, request)));
    }

    @DeleteMapping("/{faqId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "FAQ 삭제 (소프트)")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long faqId) {
        adminFaqService.delete(faqId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/reorder")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "FAQ 순서 변경")
    public ResponseEntity<ApiResponse<Void>> reorder(
            @Valid @RequestBody ReorderRequest request) {
        adminFaqService.reorder(request);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
