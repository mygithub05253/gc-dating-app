package com.ember.ember.diary.controller;

import com.ember.ember.diary.dto.*;
import com.ember.ember.diary.service.DiaryService;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"exists":false,"diaryId":null}}
                """)))
    })
    public ResponseEntity<ApiResponse<DiaryTodayResponse>> checkTodayDiary(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                diaryService.checkTodayDiary(userDetails.getUserId())));
    }

    /** 일기 작성 */
    @PostMapping("/api/diaries")
    @Operation(summary = "일기 작성 (일 1회, 200~1000자)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "작성 성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"201","message":"CREATED","data":{"diaryId":1,"status":"PRIVATE","analysisStatus":"PENDING"}}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "오늘 이미 작성함 (D001)",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"D001","message":"오늘 이미 일기를 작성했습니다","data":null}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "글자 수 미달/초과 (D002)",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"D002","message":"일기는 200~1000자 사이여야 합니다","data":null}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "금칙어 포함 (SC001)",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"SC001","message":"부적절한 표현이 포함되어 있습니다","data":null}
                """)))
    })
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
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"content":[{"diaryId":1,"content":"오늘은...","date":"2026-04-30","analysisStatus":"COMPLETED"}],"totalPages":1,"totalElements":1}}
                """)))
    })
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
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"diaryId":1,"content":"오늘은...","date":"2026-04-30","keywords":[{"tagType":"EMOTION","label":"편안함"}]}}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "일기 없음 (D004)",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"D004","message":"일기를 찾을 수 없습니다","data":null}
                """)))
    })
    public ResponseEntity<ApiResponse<DiaryDetailResponse>> getDiary(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long diaryId) {
        return ResponseEntity.ok(ApiResponse.success(
                diaryService.getDiary(userDetails.getUserId(), diaryId)));
    }

    /** 일기 수정 (당일만) */
    @PatchMapping("/api/diaries/{diaryId}")
    @Operation(summary = "당일 일기 수정 (AI 재분석 트리거)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "수정 성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"diaryId":1,"updatedAt":"2026-04-30T10:00:00"}}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "당일 일기만 수정 가능 (D005)",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"D005","message":"당일 작성한 일기만 수정할 수 있습니다","data":null}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "수정 횟수 초과 (D006)",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"D006","message":"일기 수정 횟수를 초과했습니다","data":null}
                """)))
    })
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
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"topicId":1,"title":"가장 기억에 남는 여행지는?","description":null,"isActive":true}}
                """)))
    })
    public ResponseEntity<ApiResponse<WeeklyTopicResponse>> getWeeklyTopic() {
        return ResponseEntity.ok(ApiResponse.success(diaryService.getWeeklyTopic()));
    }

    /** 임시저장 목록 조회 */
    @GetMapping("/api/diaries/drafts")
    @Operation(summary = "임시저장 목록 조회", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"drafts":[{"draftId":1,"content":"임시저장 내용","savedAt":"2026-04-30T10:00:00"}],"totalCount":1}}
                """)))
    })
    public ResponseEntity<ApiResponse<DraftListResponse>> getDrafts(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                diaryService.getDrafts(userDetails.getUserId())));
    }

    /** 임시저장 생성 */
    @PostMapping("/api/diaries/draft")
    @Operation(summary = "임시저장 생성 (최대 3건)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "저장 성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"draftId":1,"savedAt":"2026-04-30T10:00:00"}}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "임시저장 3건 초과 (D008)",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"D008","message":"임시저장은 최대 3건까지 가능합니다","data":null}
                """)))
    })
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
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "삭제 성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":null}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "임시저장 없음 (D007)",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"D007","message":"임시저장을 찾을 수 없습니다","data":null}
                """)))
    })
    public ResponseEntity<ApiResponse<Void>> deleteDraft(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long draftId) {
        diaryService.deleteDraft(userDetails.getUserId(), draftId);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
