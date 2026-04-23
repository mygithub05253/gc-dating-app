package com.ember.ember.admin.controller.content;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.content.*;
import com.ember.ember.admin.service.content.AdminTopicService;
import com.ember.ember.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * 관리자 주제 API — 관리자 API v2.1 §6.4 / §6.5.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/topics")
@Tag(name = "Admin Content - Topics", description = "주제 관리 (v2.1 §6.4, §6.5)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminTopicController {

    private final AdminTopicService adminTopicService;

    @GetMapping
    @Operation(summary = "주제 목록")
    public ResponseEntity<ApiResponse<Page<AdminTopicResponse>>> list(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean isActive,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(adminTopicService.list(category, isActive, pageable)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "주제 생성")
    public ResponseEntity<ApiResponse<AdminTopicResponse>> create(
            @Valid @RequestBody AdminTopicCreateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminTopicService.create(request)));
    }

    @PutMapping("/{topicId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "주제 수정")
    public ResponseEntity<ApiResponse<AdminTopicResponse>> update(
            @PathVariable Long topicId,
            @Valid @RequestBody AdminTopicUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminTopicService.update(topicId, request)));
    }

    @DeleteMapping("/{topicId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "주제 삭제")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long topicId) {
        adminTopicService.delete(topicId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /** §6.5 주 단위 주제 재배정. path week=월요일 날짜 (ISO). */
    @PutMapping("/schedule/{week}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "주제 스케줄 override",
            description = "week 파라미터의 주(월요일 기준)로 topicId 주제를 이동시킨다.")
    public ResponseEntity<ApiResponse<Void>> reschedule(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate week,
            @Valid @RequestBody AdminTopicScheduleUpdateRequest request) {
        adminTopicService.rescheduleForWeek(week, request.topicId(), request.overrideReason());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
