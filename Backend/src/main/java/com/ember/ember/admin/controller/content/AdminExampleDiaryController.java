package com.ember.ember.admin.controller.content;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.content.*;
import com.ember.ember.admin.service.content.AdminExampleDiaryService;
import com.ember.ember.content.domain.ExampleDiary;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/example-diaries")
@Tag(name = "Admin Content - Example Diaries", description = "예제 일기 관리 (v2.1 §6.6)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminExampleDiaryController {

    private final AdminExampleDiaryService exampleDiaryService;

    @GetMapping
    @Operation(summary = "예제 일기 목록")
    public ResponseEntity<ApiResponse<Page<AdminExampleDiaryResponse>>> list(
            @RequestParam(required = false) ExampleDiary.Category category,
            @RequestParam(required = false) ExampleDiary.DisplayTarget displayTarget,
            @RequestParam(required = false) Boolean isActive,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                exampleDiaryService.list(category, displayTarget, isActive, pageable)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "예제 일기 생성")
    public ResponseEntity<ApiResponse<AdminExampleDiaryResponse>> create(
            @Valid @RequestBody AdminExampleDiaryCreateRequest request,
            @AuthenticationPrincipal CustomUserDetails admin) {
        return ResponseEntity.ok(ApiResponse.success(exampleDiaryService.create(request, admin)));
    }

    @PutMapping("/{exampleId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "예제 일기 수정")
    public ResponseEntity<ApiResponse<AdminExampleDiaryResponse>> update(
            @PathVariable Long exampleId,
            @Valid @RequestBody AdminExampleDiaryUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(exampleDiaryService.update(exampleId, request)));
    }

    @DeleteMapping("/{exampleId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "예제 일기 삭제")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long exampleId) {
        exampleDiaryService.delete(exampleId);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
