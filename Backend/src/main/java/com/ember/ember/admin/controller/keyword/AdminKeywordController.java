package com.ember.ember.admin.controller.keyword;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.keyword.AdminKeywordDto.CreateRequest;
import com.ember.ember.admin.dto.keyword.AdminKeywordDto.KeywordResponse;
import com.ember.ember.admin.dto.keyword.AdminKeywordDto.UpdateRequest;
import com.ember.ember.admin.dto.keyword.AdminKeywordDto.WeightUpdateRequest;
import com.ember.ember.admin.service.keyword.AdminKeywordService;
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
 * 관리자 이상형 키워드 API — 관리자 API v2.1 §24.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/keywords")
@Tag(name = "Admin Keyword", description = "이상형 키워드 마스터 관리 (명세 v2.1 §24)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminKeywordController {

    private final AdminKeywordService adminKeywordService;

    @GetMapping
    @Operation(summary = "키워드 목록 조회")
    public ResponseEntity<ApiResponse<Page<KeywordResponse>>> list(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                adminKeywordService.list(category, isActive, page, size)));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "키워드 생성 (SUPER_ADMIN)")
    public ResponseEntity<ApiResponse<KeywordResponse>> create(
            @Valid @RequestBody CreateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminKeywordService.create(request)));
    }

    @PutMapping("/{keywordId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "키워드 수정 (SUPER_ADMIN)")
    public ResponseEntity<ApiResponse<KeywordResponse>> update(
            @PathVariable Long keywordId,
            @Valid @RequestBody UpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                adminKeywordService.update(keywordId, request)));
    }

    @PatchMapping("/{keywordId}/active")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "키워드 활성/비활성 토글 (SUPER_ADMIN)")
    public ResponseEntity<ApiResponse<KeywordResponse>> toggleActive(
            @PathVariable Long keywordId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminKeywordService.toggleActive(keywordId)));
    }

    @PatchMapping("/weights")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "키워드 가중치 일괄 수정 (SUPER_ADMIN)")
    public ResponseEntity<ApiResponse<Void>> updateWeights(
            @Valid @RequestBody WeightUpdateRequest request) {
        adminKeywordService.updateWeights(request);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
