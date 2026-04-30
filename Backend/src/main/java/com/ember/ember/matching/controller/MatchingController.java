package com.ember.ember.matching.controller;

import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.matching.dto.*;
import com.ember.ember.matching.service.ExploreService;
import com.ember.ember.matching.service.MatchingService;
import com.ember.ember.matching.service.MatchingService.RecommendationResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Matching", description = "매칭 탐색 API")
public class MatchingController {

    private static final String HEADER_DEGRADED = "X-Degraded";

    private final MatchingService matchingService;
    private final ExploreService exploreService;

    /** 5.1 일기 탐색 (Pull 방식) */
    @GetMapping("/api/diaries/explore")
    @Operation(summary = "일기 탐색 (커서 기반 페이징, 정렬/필터 지원)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"diaries":[{"diaryId":10,"nickname":"미소짓는풍선","ageGroup":"20대","sido":"서울특별시","sigungu":"강남구","content":"오늘은...","personalityKeywords":["안정 추구","공감 우선"]}],"nextCursor":9,"hasMore":true}}
                """)))
    })
    public ResponseEntity<ApiResponse<ExploreResponse>> explore(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) Long cursor,
            @RequestParam(defaultValue = "latest") String sort,
            @RequestParam(required = false) String sido,
            @RequestParam(required = false) String sigungu,
            @RequestParam(required = false) String ageGroup,
            @RequestParam(defaultValue = "true") boolean keywordFilter) {
        return ResponseEntity.ok(ApiResponse.success(
                exploreService.explore(userDetails.getUserId(), cursor, sort, sido, sigungu, ageGroup, keywordFilter)));
    }

    /** 5.1-2 탐색 일기 상세 */
    @GetMapping("/api/diaries/{diaryId}/detail")
    @Operation(summary = "탐색 일기 상세 조회 (유사도 배지 + 작성자 다른 일기)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"diaryId":10,"content":"오늘은...","personalityKeywords":["안정 추구"],"otherDiaries":[{"diaryId":11,"preview":"어제는..."}]}}
                """)))
    })
    public ResponseEntity<ApiResponse<DiaryDetailExploreResponse>> diaryDetail(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long diaryId) {
        return ResponseEntity.ok(ApiResponse.success(
                exploreService.detail(userDetails.getUserId(), diaryId)));
    }

    /** 5.2-1 AI 추천 목록 */
    @GetMapping("/api/matching/recommendations")
    @Operation(summary = "AI 기반 추천 일기 목록", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":[{"diaryId":10,"nickname":"미소짓는풍선","preview":"오늘은...","similarityScore":0.85}]}
                """)))
    })
    public ResponseEntity<ApiResponse<RecommendationResponse>> getRecommendations(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        RecommendationResult result = matchingService.getRecommendations(userDetails.getUserId());

        ResponseEntity.BodyBuilder builder = ResponseEntity.ok();
        if (result.degraded()) {
            builder.header(HEADER_DEGRADED, "true");
            log.info("[MatchingController] stale 폴백 응답 — userId={}", userDetails.getUserId());
        }

        return builder.body(ApiResponse.success(result.response()));
    }

    /** 5.2-2 블라인드 미리보기 */
    @GetMapping("/api/matching/recommendations/{diaryId}/preview")
    @Operation(summary = "추천 일기 블라인드 미리보기", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"diaryId":10,"preview":"오늘은 정말 좋은...","similarityBadge":"잘 맞을 것 같아요"}}
                """)))
    })
    public ResponseEntity<ApiResponse<DiaryPreviewResponse>> preview(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long diaryId) {
        return ResponseEntity.ok(ApiResponse.success(
                exploreService.preview(userDetails.getUserId(), diaryId)));
    }

    /** 5.3 라이프스타일 리포트 */
    @GetMapping("/api/matching/lifestyle-report")
    @Operation(summary = "라이프스타일 분석 리포트", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"analysisAvailable":true,"requiredDiaryCount":5,"currentDiaryCount":7}}
                """)))
    })
    public ResponseEntity<ApiResponse<LifestyleReportResponse>> lifestyleReport(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                exploreService.getLifestyleReport(userDetails.getUserId())));
    }

    /** 받은 매칭 요청 목록 */
    @GetMapping("/api/matching/requests")
    @Operation(summary = "받은 매칭 요청 목록 조회", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":[{"matchingId":1,"nickname":"미소짓는풍선","ageGroup":"20대","preview":"오늘은..."}]}
                """)))
    })
    public ResponseEntity<ApiResponse<java.util.List<MatchingRequestItem>>> getReceivedRequests(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                exploreService.getReceivedRequests(userDetails.getUserId())));
    }

    /** 매칭 요청 수락 */
    @PostMapping("/api/matching/requests/{matchingId}/accept")
    @Operation(summary = "매칭 요청 수락 (매칭 성사)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "수락 성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"roomUuid":"bf48bc80-4773-4d50-a293-3ba5f7cea823"}}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭 없음 (M006)",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"M006","message":"매칭 요청을 찾을 수 없습니다","data":null}
                """)))
    })
    public ResponseEntity<ApiResponse<MatchingSelectResponse>> acceptRequest(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long matchingId) {
        return ResponseEntity.ok(ApiResponse.success(
                exploreService.acceptRequest(userDetails.getUserId(), matchingId)));
    }

    /** 5.4-1 교환 신청 */
    @PostMapping("/api/matching/{diaryId}/select")
    @Operation(summary = "교환일기 신청 (상대 일기 선택)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "신청 성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"matchingId":1,"status":"PENDING"}}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "이미 신청한 일기 (M001)",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"M001","message":"이미 매칭 요청을 보낸 상대입니다","data":null}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "자기 일기에 신청 (M005)",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"M005","message":"본인의 일기에는 매칭 요청할 수 없습니다","data":null}
                """)))
    })
    public ResponseEntity<ApiResponse<MatchingSelectResponse>> select(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long diaryId) {
        return ResponseEntity.ok(ApiResponse.success(
                exploreService.select(userDetails.getUserId(), diaryId)));
    }

    /** 5.4-2 넘기기 (skip) */
    @PostMapping("/api/matching/{diaryId}/skip")
    @Operation(summary = "추천 일기 넘기기 (7일 재추천 제외)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":null}
                """)))
    })
    public ResponseEntity<ApiResponse<Void>> skip(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long diaryId) {
        exploreService.skip(userDetails.getUserId(), diaryId);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
