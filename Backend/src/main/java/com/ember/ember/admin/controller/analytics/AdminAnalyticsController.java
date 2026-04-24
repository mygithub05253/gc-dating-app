package com.ember.ember.admin.controller.analytics;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.analytics.AiPerformanceResponse;
import com.ember.ember.admin.dto.analytics.AssociationRulesResponse;
import com.ember.ember.admin.dto.analytics.CohortRetentionResponse;
import com.ember.ember.admin.dto.analytics.DiaryEmotionTrendResponse;
import com.ember.ember.admin.dto.analytics.DiaryLengthQualityResponse;
import com.ember.ember.admin.dto.analytics.DiaryTimeHeatmapResponse;
import com.ember.ember.admin.dto.analytics.DiaryTopicParticipationResponse;
import com.ember.ember.admin.dto.analytics.ExchangeResponseRateResponse;
import com.ember.ember.admin.dto.analytics.ExchangeTurnFunnelResponse;
import com.ember.ember.admin.dto.analytics.JourneyDurationResponse;
import com.ember.ember.admin.dto.analytics.KeywordTopResponse;
import com.ember.ember.admin.dto.analytics.MatchingDiversityResponse;
import com.ember.ember.admin.dto.analytics.MatchingFunnelResponse;
import com.ember.ember.admin.dto.analytics.RetentionSurvivalResponse;
import com.ember.ember.admin.dto.analytics.SegmentOverviewResponse;
import com.ember.ember.admin.dto.analytics.UserFunnelResponse;
import com.ember.ember.admin.dto.analytics.UserSegmentationResponse;
import com.ember.ember.admin.service.analytics.AdminAnalyticsService;
import com.ember.ember.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 관리자 분석 API — 관리자 API 통합명세서 v2.1 §18.
 *
 * 구현 범위:
 *   - §18.1 매칭 퍼널 (getMatchingFunnel)          — B-1.1
 *   - §3.2 사용자 퍼널·코호트 (getUserFunnel)       — B-1.2
 *   - §3.3 키워드 TopN (getKeywordTop)              — B-1.3
 *   - §3.4 세그먼트 Overview (getSegmentOverview)   — B-1.4
 *   - §3.5 여정 소요시간 (getJourneyDurations)      — B-1.5
 *   - §3.6 AI 성능 (getAiPerformance)               — B-1.6
 *   - §3.7 매칭 다양성 (getMatchingDiversity)       — B-1.7
 *   - §3.8 일기 시간 히트맵 (getDiaryTimeHeatmap)    — B-2.1
 *   - §3.9 일기 길이·품질 (getDiaryLengthQuality)     — B-2.2
 *   - §3.10 감정 태그 추이 (getDiaryEmotionTrends)    — B-2.3
 *   - §3.11 주제 참여 (getDiaryTopicParticipation)   — B-2.4
 *   - §3.12 교환일기 응답률 (getExchangeResponseRate) — B-2.5
 *   - §3.13 턴→채팅 퍼널 (getExchangeTurnFunnel)     — B-2.6
 *   - §3.14 이탈 생존분석 (getRetentionSurvival)       — B-2.7 (Kaplan-Meier)
 *   - §3.15 사용자 세그먼테이션 (getUserSegmentation)   — B-3 (RFM Quintile + K-Means)
 *   - §3.16 연관 규칙 마이닝 (getDiaryAssociationRules) — B-4 (Apriori)
 *   - §3.17 코호트 리텐션 매트릭스 (getCohortRetention)  — B-5
 *
 * 근거 문서:
 *   - docs/md/architecture/analytics/Ember_분석API_데이터설계서_v0.1.md §3.1~§3.2
 *   - docs/md/architecture/analytics/Ember_분석API_데이터설계서_v0.2.md §3.3~§3.7
 *   - 관리자 API 통합명세서 v2.1 §18 데이터 분석 API
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/analytics")
@Tag(name = "Admin Analytics", description = "관리자 분석 API (v2.1 §18)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminAnalyticsController {

    private final AdminAnalyticsService adminAnalyticsService;

    // ------------------------------------------------------------------------
    // §18.1 매칭 퍼널 — B-1.1
    // ------------------------------------------------------------------------
    @GetMapping("/matching/funnel")
    @Operation(summary = "매칭 퍼널 분석",
            description = "일별 매칭 요청→성사→교환일기→커플 5단 퍼널. gender=M|F|ALL 필터. 설계서 §3.1.")
    public ResponseEntity<ApiResponse<MatchingFunnelResponse>> getMatchingFunnel(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "ALL") String gender) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(29);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getMatchingFunnel(start, end, gender)));
    }

    // ------------------------------------------------------------------------
    // §3.2 사용자 퍼널·코호트 — B-1.2
    // ------------------------------------------------------------------------
    @GetMapping("/users/funnel")
    @Operation(summary = "사용자 퍼널·코호트 분석",
            description = "주 단위 코호트별 signup→profile→match→exchange→couple 5단 퍼널. "
                    + "cohort=signup_date(기본) | first_match_date. 설계서 §3.2.")
    public ResponseEntity<ApiResponse<UserFunnelResponse>> getUserFunnel(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "signup_date") String cohort) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(89);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getUserFunnel(start, end, cohort)));
    }

    // ------------------------------------------------------------------------
    // §3.3 키워드 TopN — B-1.3
    // ------------------------------------------------------------------------
    @GetMapping("/keywords/top")
    @Operation(summary = "키워드 TopN 분석",
            description = "기간 내 완료 일기의 태그 유형별 상위 키워드. "
                    + "tagType=EMOTION|LIFESTYLE|RELATIONSHIP_STYLE|TONE|ALL. k-anonymity 5 적용. 설계서 §3.3.")
    public ResponseEntity<ApiResponse<KeywordTopResponse>> getKeywordTop(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "ALL") String tagType,
            @RequestParam(required = false, defaultValue = "50") int limit) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(29);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getKeywordTop(start, end, tagType, limit)));
    }

    // ------------------------------------------------------------------------
    // §3.4 세그먼트 Overview — B-1.4
    // ------------------------------------------------------------------------
    @GetMapping("/segments/overview")
    @Operation(summary = "세그먼트 Overview",
            description = "성별×연령대×지역 세그먼트별 metric 집계. "
                    + "metric=SIGNUP(기본)|ACTIVE|DIARY|ACCEPT. groupBy=gender,ageGroup,regionCode. "
                    + "k-anonymity 5 미만은 masked. 설계서 §3.4.")
    public ResponseEntity<ApiResponse<SegmentOverviewResponse>> getSegmentOverview(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "SIGNUP") String metric,
            @RequestParam(required = false) List<String> groupBy) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(29);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getSegmentOverview(start, end, metric, groupBy)));
    }

    // ------------------------------------------------------------------------
    // §3.5 여정 소요시간 분포 — B-1.5 (Fallback)
    // ------------------------------------------------------------------------
    @GetMapping("/journeys/durations")
    @Operation(summary = "여정 단계별 소요시간 분포 (Fallback)",
            description = "signup→profile→match→exchange→couple 단계별 P50/P90/P99 시간(hour). "
                    + "user_activity_events 이벤트 미적재로 Fallback 쿼리 사용(X-Degraded). 설계서 §3.5.")
    public ResponseEntity<ApiResponse<JourneyDurationResponse>> getJourneyDurations(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(89);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getJourneyDurations(start, end)));
    }

    // ------------------------------------------------------------------------
    // §3.6 AI 성능 — B-1.6 (DB Fallback)
    // ------------------------------------------------------------------------
    @GetMapping("/ai/performance")
    @Operation(summary = "AI 성능 분석 (DB Fallback)",
            description = "일기 분석 성공/실패율 + 라이프스타일 분석 처리량. "
                    + "심층 Latency/큐 지표는 Prometheus 참조. 설계서 §3.6.")
    public ResponseEntity<ApiResponse<AiPerformanceResponse>> getAiPerformance(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTs,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTs) {

        LocalDateTime end = endTs != null ? endTs : LocalDateTime.now();
        LocalDateTime start = startTs != null ? startTs : end.minusHours(24);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getAiPerformance(start, end)));
    }

    // ------------------------------------------------------------------------
    // §3.7 매칭 다양성·재추천 — B-1.7
    // ------------------------------------------------------------------------
    @GetMapping("/matching/diversity")
    @Operation(summary = "매칭 추천 다양성·재추천 분석",
            description = "Shannon Entropy + 14일 이내 재추천 비율. 설계서 §3.7.")
    public ResponseEntity<ApiResponse<MatchingDiversityResponse>> getMatchingDiversity(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(6);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getMatchingDiversity(start, end)));
    }

    // ------------------------------------------------------------------------
    // §3.8 일기 시간 히트맵 — B-2.1
    // ------------------------------------------------------------------------
    @GetMapping("/diary/time-heatmap")
    @Operation(summary = "일기 작성 시간 히트맵",
            description = "요일(0=일)×시간(0~23) 24×7 히트맵. KST 기준. 설계서 §3.8.")
    public ResponseEntity<ApiResponse<DiaryTimeHeatmapResponse>> getDiaryTimeHeatmap(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(29);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getDiaryTimeHeatmap(start, end)));
    }

    // ------------------------------------------------------------------------
    // §3.9 일기 길이·품질 — B-2.2
    // ------------------------------------------------------------------------
    @GetMapping("/diary/length-quality")
    @Operation(summary = "일기 길이·품질 분포",
            description = "문자수 p50/p90/p99 + 5구간 히스토그램 + AI 분석 성공률. 설계서 §3.9.")
    public ResponseEntity<ApiResponse<DiaryLengthQualityResponse>> getDiaryLengthQuality(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(29);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getDiaryLengthQuality(start, end)));
    }

    // ------------------------------------------------------------------------
    // §3.10 감정 태그 추이 시계열 — B-2.3
    // ------------------------------------------------------------------------
    @GetMapping("/diary/emotion-trends")
    @Operation(summary = "감정 태그 추이 시계열",
            description = "diary_keywords(tag_type=EMOTION) 기반 일자/주 단위 TopN 감정 추이. "
                    + "bucket=day|week. 설계서 §3.10.")
    public ResponseEntity<ApiResponse<DiaryEmotionTrendResponse>> getDiaryEmotionTrends(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "day") String bucket,
            @RequestParam(required = false, defaultValue = "5") int topN) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(29);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getDiaryEmotionTrends(start, end, bucket, topN)));
    }

    // ------------------------------------------------------------------------
    // §3.11 주제(카테고리) 참여도 — B-2.4
    // ------------------------------------------------------------------------
    @GetMapping("/diary/topic-participation")
    @Operation(summary = "주제(카테고리) 참여도 분포",
            description = "diaries.category 기준 일기 수·distinct 사용자·점유율. 설계서 §3.11.")
    public ResponseEntity<ApiResponse<DiaryTopicParticipationResponse>> getDiaryTopicParticipation(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(29);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getDiaryTopicParticipation(start, end)));
    }

    // ------------------------------------------------------------------------
    // §3.12 교환일기 응답률 — B-2.5
    // ------------------------------------------------------------------------
    @GetMapping("/exchange/response-rate")
    @Operation(summary = "교환일기 응답률·지연시간",
            description = "턴1 제출 후 windowHours 이내 턴2 응답 비율 + 전체 턴별 지연시간 p50/p90. "
                    + "windowHours 기본 48h. 설계서 §3.12.")
    public ResponseEntity<ApiResponse<ExchangeResponseRateResponse>> getExchangeResponseRate(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "48") int windowHours) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(29);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getExchangeResponseRate(start, end, windowHours)));
    }

    // ------------------------------------------------------------------------
    // §3.13 교환일기 턴→채팅 퍼널 — B-2.6
    // ------------------------------------------------------------------------
    @GetMapping("/exchange/turn-funnel")
    @Operation(summary = "교환일기 턴→채팅 전환 퍼널",
            description = "ROOM_CREATED→TURN_1~4→CHAT_CONNECTED 6단 퍼널. worstStage 자동 계산. 설계서 §3.13.")
    public ResponseEntity<ApiResponse<ExchangeTurnFunnelResponse>> getExchangeTurnFunnel(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(29);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getExchangeTurnFunnel(start, end)));
    }

    // ------------------------------------------------------------------------
    // §3.16 연관 규칙 마이닝 Apriori — B-4
    // ------------------------------------------------------------------------
    @GetMapping("/diary/association-rules")
    @Operation(summary = "일기 태그 연관 규칙 마이닝 (Apriori)",
            description = "일기의 태그 집합(EMOTION/LIFESTYLE/TONE/RELATIONSHIP_STYLE)에서 "
                    + "support/confidence/lift 임계값을 만족하는 연관 규칙 추출. "
                    + "minSupport 기본 0.02, minConfidence 0.3, minLift 1.2, maxItemsetSize 3(2~3). "
                    + "tagTypes 미지정 시 4종 전부 포함. 설계서 §3.16.")
    public ResponseEntity<ApiResponse<AssociationRulesResponse>> getDiaryAssociationRules(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) List<String> tagTypes,
            @RequestParam(required = false) Double minSupport,
            @RequestParam(required = false) Double minConfidence,
            @RequestParam(required = false) Double minLift,
            @RequestParam(required = false) Integer maxItemsetSize) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(29);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getDiaryAssociationRules(
                        start, end, tagTypes, minSupport, minConfidence, minLift, maxItemsetSize)));
    }

    // ------------------------------------------------------------------------
    // §3.15 사용자 세그먼테이션 RFM Quintile + K-Means — B-3
    // ------------------------------------------------------------------------
    @GetMapping("/users/segmentation")
    @Operation(summary = "사용자 세그먼테이션 (RFM + K-Means)",
            description = "RFE(Recency/Frequency/Engagement) 벡터 기반 이중 세그먼테이션. "
                    + "method=RFM|KMEANS|BOTH(기본). k 는 K-Means 클러스터 수(2~10, 기본 5). "
                    + "재현성: seed=42 고정. Inertia 반환으로 Elbow method 지원. 설계서 §3.15.")
    public ResponseEntity<ApiResponse<UserSegmentationResponse>> getUserSegmentation(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "BOTH") String method,
            @RequestParam(required = false, defaultValue = "5") int k) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(29);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getUserSegmentation(start, end, method, k)));
    }

    // ------------------------------------------------------------------------
    // §3.14 사용자 이탈 생존분석 Kaplan-Meier — B-2.7
    // ------------------------------------------------------------------------
    @GetMapping("/users/retention-survival")
    @Operation(summary = "Kaplan-Meier 사용자 이탈 생존분석",
            description = "가입일 기준 이탈 시점 추정 + Greenwood 분산 + 95% CI. "
                    + "이벤트 정의: deactivated_at 또는 last_login_at < NOW - inactivityDays. "
                    + "inactivityDays 기본 30일 (7~180 범위). 설계서 §3.14.")
    public ResponseEntity<ApiResponse<RetentionSurvivalResponse>> getRetentionSurvival(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "30") int inactivityDays) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(89);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getRetentionSurvival(start, end, inactivityDays)));
    }

    // ------------------------------------------------------------------------
    // §3.17 코호트 리텐션 매트릭스 — B-5
    // ------------------------------------------------------------------------
    @GetMapping("/users/cohort-retention")
    @Operation(summary = "코호트 리텐션 매트릭스",
            description = "주 단위 signup 코호트 × 가입 후 경과 주(week 0..N-1) 리텐션 매트릭스. "
                    + "활동 정의 = 일기 작성 OR 교환일기 제출. maxWeeks 기본 12 (1~26). "
                    + "관측 미완료 셀은 null (공정 비교 보장). Amplitude/Mixpanel 스타일 Retention Curve. "
                    + "설계서 §3.17.")
    public ResponseEntity<ApiResponse<CohortRetentionResponse>> getCohortRetention(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "12") int maxWeeks) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        // 기본: 최근 12주 signup 코호트
        LocalDate start = startDate != null ? startDate : end.minusWeeks(12);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getCohortRetention(start, end, maxWeeks)));
    }
}
