package com.ember.ember.admin.controller.content;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.content.AdminDiaryDeleteRequest;
import com.ember.ember.admin.dto.content.AdminDiaryListResponse;
import com.ember.ember.admin.service.content.AdminDiaryService;
import com.ember.ember.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자 일기 관리 API — §6 콘텐츠 관리.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/diaries")
@Tag(name = "Admin Content - Diaries", description = "관리자 일기 관리")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminDiaryController {

    private final AdminDiaryService adminDiaryService;

    /** 일기 목록 조회 (관리자). */
    @GetMapping
    @Operation(summary = "일기 목록 조회",
            description = "status 필터: ACTIVE(삭제 안 됨), DELETED(삭제됨), REPORTED(신고 상태). null이면 전체.")
    public ResponseEntity<ApiResponse<Page<AdminDiaryListResponse>>> list(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(adminDiaryService.list(status, pageable)));
    }

    /** 일기 소프트 삭제 (관리자). */
    @DeleteMapping("/{diaryId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "일기 삭제 (소프트)", description = "deleted_at 설정으로 소프트 삭제. 삭제 사유(adminMemo) 필수.")
    public ResponseEntity<ApiResponse<Void>> softDelete(
            @PathVariable Long diaryId,
            @Valid @RequestBody AdminDiaryDeleteRequest request) {
        adminDiaryService.softDelete(diaryId, request.adminMemo());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
