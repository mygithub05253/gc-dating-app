package com.ember.ember.diary.controller;

import com.ember.ember.diary.dto.*;
import com.ember.ember.diary.service.DiaryService;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 일기 API 컨트롤러.
 * 결정 6: main 버전 베이스 채택 (7개 엔드포인트, Swagger 포함).
 * createDiary 메서드는 3필드 포함된 DiaryCreateRequest 사용.
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Diary", description = "일기 API")
public class DiaryController {

    private final DiaryService diaryService;

    /** 당일 일기 작성 여부 확인 */
    @GetMapping("/api/diaries/today")
    @Operation(summary = "당일 일기 작성 여부 확인", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<DiaryTodayResponse>> checkTodayDiary(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                diaryService.checkTodayDiary(userDetails.getUserId())));
    }

    /** 일기 작성 */
    @PostMapping("/api/diaries")
    @Operation(summary = "일기 작성 (일 1회, 200~1000자)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<DiaryCreateResponse>> createDiary(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody DiaryCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(
                        diaryService.createDiary(userDetails.getUserId(), request)));
    }

    /** 일기 목록 조회 (페이징) */
    @GetMapping("/api/diaries")
    @Operation(summary = "내 일기 목록 조회 (최신순, 페이징)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<DiaryListResponse>> getDiaries(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                diaryService.getDiaries(userDetails.getUserId(), page, size)));
    }

    /** 일기 상세 조회 */
    @GetMapping("/api/diaries/{diaryId}")
    @Operation(summary = "일기 상세 조회 (AI 분석 결과 포함)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<DiaryDetailResponse>> getDiary(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long diaryId) {
        return ResponseEntity.ok(ApiResponse.success(
                diaryService.getDiary(userDetails.getUserId(), diaryId)));
    }

    /** 일기 수정 (당일만) */
    @PatchMapping("/api/diaries/{diaryId}")
    @Operation(summary = "당일 일기 수정 (AI 재분석 트리거)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<DiaryUpdateResponse>> updateDiary(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long diaryId,
            @Valid @RequestBody DiaryUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                diaryService.updateDiary(userDetails.getUserId(), diaryId, request)));
    }

    /** 수요일 주제 조회 */
    @GetMapping("/api/diaries/weekly-topic")
    @Operation(summary = "이번 주 수요일 주제 조회")
    public ResponseEntity<ApiResponse<WeeklyTopicResponse>> getWeeklyTopic() {
        return ResponseEntity.ok(ApiResponse.success(diaryService.getWeeklyTopic()));
    }

    /** 임시저장 목록 조회 */
    @GetMapping("/api/diaries/drafts")
    @Operation(summary = "임시저장 목록 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<DraftListResponse>> getDrafts(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                diaryService.getDrafts(userDetails.getUserId())));
    }

    /** 임시저장 생성 */
    @PostMapping("/api/diaries/draft")
    @Operation(summary = "임시저장 생성 (최대 3건)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<DraftResponse>> createDraft(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody DraftCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(
                        diaryService.createDraft(userDetails.getUserId(), request)));
    }

    /** 임시저장 삭제 */
    @DeleteMapping("/api/diaries/draft/{draftId}")
    @Operation(summary = "임시저장 삭제", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> deleteDraft(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long draftId) {
        diaryService.deleteDraft(userDetails.getUserId(), draftId);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
