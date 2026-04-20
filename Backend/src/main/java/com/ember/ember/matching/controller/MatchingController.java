package com.ember.ember.matching.controller;

import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.matching.dto.RecommendationResponse;
import com.ember.ember.matching.service.MatchingService;
import com.ember.ember.matching.service.MatchingService.RecommendationResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 매칭 추천 API 컨트롤러.
 *
 * GET /api/matching/recommendations
 *   - 인증된 사용자에게 AI 기반 추천 결과 반환
 *   - AI 장애 시 stale 캐시 반환 + X-Degraded: true 헤더
 *
 * TODO: 인증 처리 구현 시 @AuthenticationPrincipal로 userId 추출.
 *   현재 M4에서는 DiaryController 패턴과 동일하게 @RequestParam으로 임시 처리.
 *   M5 인증 연동 스프린트에서 교체 예정.
 */
@Slf4j
@RestController
@RequestMapping("/api/matching")
@RequiredArgsConstructor
public class MatchingController {

    private static final String HEADER_DEGRADED = "X-Degraded";

    private final MatchingService matchingService;

    /**
     * 매칭 추천 결과 조회.
     *
     * @param userId 인증된 사용자 PK (TODO: JWT 인증 연동 후 @AuthenticationPrincipal로 교체)
     * @return 200 OK + 추천 결과 (AI 장애 시 X-Degraded: true 헤더 포함)
     */
    @GetMapping("/recommendations")
    public ResponseEntity<ApiResponse<RecommendationResponse>> getRecommendations(
            @RequestParam Long userId
    ) {
        RecommendationResult result = matchingService.getRecommendations(userId);

        ResponseEntity.BodyBuilder builder = ResponseEntity.ok();

        // AI 장애로 stale 캐시 폴백 시 헤더 추가
        if (result.degraded()) {
            builder.header(HEADER_DEGRADED, "true");
            log.info("[MatchingController] stale 폴백 응답 — userId={}", userId);
        }

        return builder.body(ApiResponse.success(result.response()));
    }
}
