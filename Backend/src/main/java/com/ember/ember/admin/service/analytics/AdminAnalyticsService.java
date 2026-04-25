package com.ember.ember.admin.service.analytics;

import com.ember.ember.admin.dto.analytics.AiPerformanceResponse;
import com.ember.ember.admin.dto.analytics.AssociationRulesResponse;
import com.ember.ember.admin.dto.analytics.ChurnAtRiskResponse;
import com.ember.ember.admin.dto.analytics.ChurnFunnelResponse;
import com.ember.ember.admin.dto.analytics.ChurnReasonsResponse;
import com.ember.ember.admin.dto.analytics.ChurnTimelineResponse;
import com.ember.ember.admin.dto.analytics.CohortRetentionResponse;
import com.ember.ember.admin.dto.analytics.DiaryEmotionTrendResponse;
import com.ember.ember.admin.dto.analytics.DiaryLengthQualityResponse;
import com.ember.ember.admin.dto.analytics.DiaryTimeHeatmapResponse;
import com.ember.ember.admin.dto.analytics.DiaryTopicParticipationResponse;
import com.ember.ember.admin.dto.analytics.ExchangeResponseRateResponse;
import com.ember.ember.admin.dto.analytics.ExchangeTurnFunnelResponse;
import com.ember.ember.admin.dto.analytics.InactiveUsersSummaryResponse;
import com.ember.ember.admin.dto.analytics.JourneyDurationResponse;
import com.ember.ember.admin.dto.analytics.KeywordTopResponse;
import com.ember.ember.admin.dto.analytics.MatchingDiversityResponse;
import com.ember.ember.admin.dto.analytics.MatchingFunnelResponse;
import com.ember.ember.admin.dto.analytics.WithdrawalReasonResponse;
import com.ember.ember.admin.dto.analytics.WithdrawalStatsResponse;
import com.ember.ember.admin.dto.analytics.MatchingFunnelResponse.DailyFunnelPoint;
import com.ember.ember.admin.dto.analytics.MatchingFunnelResponse.Meta;
import com.ember.ember.admin.dto.analytics.MatchingFunnelResponse.Period;
import com.ember.ember.admin.dto.analytics.MatchingFunnelResponse.StageTotals;
import com.ember.ember.admin.dto.analytics.RetentionSurvivalResponse;
import com.ember.ember.admin.dto.analytics.SegmentOverviewResponse;
import com.ember.ember.admin.dto.analytics.UserFunnelResponse;
import com.ember.ember.admin.dto.analytics.UserSegmentationResponse;
import com.ember.ember.admin.repository.analytics.AnalyticsAiPerformanceRepository;
import com.ember.ember.admin.repository.analytics.AnalyticsAssociationRepository;
import com.ember.ember.admin.repository.analytics.AnalyticsCohortRepository;
import com.ember.ember.admin.repository.analytics.AnalyticsDiaryPatternRepository;
import com.ember.ember.admin.repository.analytics.AnalyticsExchangePatternRepository;
import com.ember.ember.admin.repository.analytics.AnalyticsFunnelRepository;
import com.ember.ember.admin.repository.analytics.AnalyticsJourneyRepository;
import com.ember.ember.admin.repository.analytics.AnalyticsKeywordRepository;
import com.ember.ember.admin.repository.analytics.AnalyticsMatchingDiversityRepository;
import com.ember.ember.admin.repository.analytics.AnalyticsSegmentRepository;
import com.ember.ember.admin.repository.analytics.AnalyticsSegmentationRepository;
import com.ember.ember.admin.repository.analytics.AnalyticsSurvivalRepository;
import com.ember.ember.admin.repository.analytics.AnalyticsUserFunnelRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * 관리자 분석 서비스 — 관리자 API v2.1 §18 / 설계서 §3 전반.
 *
 * 구현 범위:
 *   - §18.1 매칭 퍼널                (B-1.1, 본 클래스 최초 구현)
 *   - §3.2  사용자 퍼널·코호트        (B-1.2)
 *   - §3.3  키워드 TopN              (B-1.3)
 *   - §3.4  세그먼트 Overview         (B-1.4)
 *   - §3.5  여정 소요시간 분포        (B-1.5, Fallback)
 *   - §3.6  AI 성능                  (B-1.6, DB Fallback — Prometheus 별도)
 *   - §3.7  매칭 통계 보조            (B-1.7, 추천 다양성·재추천)
 *   - §3.8  일기 시간 히트맵          (B-2.1)
 *   - §3.9  일기 길이·품질             (B-2.2)
 *   - §3.10 감정 태그 추이 시계열       (B-2.3)
 *   - §3.11 주제(카테고리) 참여도       (B-2.4)
 *   - §3.12 교환일기 응답률            (B-2.5)
 *   - §3.13 턴→채팅 전환 퍼널         (B-2.6)
 *   - §3.14 사용자 이탈 생존분석 (Kaplan-Meier) (B-2.7)
 *   - §3.15 사용자 세그먼테이션 (RFM Quintile + K-Means) (B-3)
 *   - §3.16 연관 규칙 마이닝 (Apriori — 감정↔라이프스타일↔톤 동시 출현) (B-4)
 *   - §3.17 코호트 리텐션 매트릭스 (Weekly signup × week_offset 활동 비율) (B-5)
 *
 * 설계 준수 사항:
 *   - 분모·분자 분리: 일별 포인트는 raw count, 합계에서만 비율 계산.
 *   - Point-in-time: created_at / matched_at / confirmed_at / occurred_at 그대로 사용.
 *   - Half-open interval: [startDate, endDateExclusive).
 *   - KST 처리: 일별 버킷은 AT TIME ZONE 'Asia/Seoul' → DATE 캐스팅.
 *   - k-anonymity: 세그먼트·키워드 집계에서 kMin(기본 5) 미만은 masked 또는 필터.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminAnalyticsService {

    private static final String TZ = "Asia/Seoul";
    private static final int K_ANON_MIN = 5;
    private static final int PROFILE_DONE_STEP = 1;
    private static final int RERECOMMENDATION_WINDOW_DAYS = 14;
    private static final String DATA_SOURCE_V2 = "live-v0.2";
    private static final int DEFAULT_FIRST_RESPONSE_WINDOW_HOURS = 48;
    private static final int DEFAULT_INACTIVITY_THRESHOLD_DAYS = 30;
    private static final double Z_95 = 1.959963984540054d; // 1.96 approx (φ⁻¹(0.975))

    // B-3 K-Means 튜닝 파라미터
    private static final int KMEANS_MAX_ITER = 50;
    private static final double KMEANS_TOLERANCE = 1e-4;
    private static final long KMEANS_SEED = 42L;
    private static final int SEGMENTATION_MIN_K = 2;
    private static final int SEGMENTATION_MAX_K = 10;

    // B-4 Apriori 기본값
    private static final double APRIORI_DEFAULT_MIN_SUPPORT = 0.02d;
    private static final double APRIORI_DEFAULT_MIN_CONFIDENCE = 0.30d;
    private static final double APRIORI_DEFAULT_MIN_LIFT = 1.20d;
    private static final int APRIORI_DEFAULT_MAX_K = 3;
    private static final int APRIORI_RULES_LIMIT = 200;
    private static final int APRIORI_ITEMSETS_LIMIT = 500;

    // B-5 Cohort Retention 기본값
    private static final int COHORT_DEFAULT_MAX_WEEKS = 12;
    private static final int COHORT_MIN_WEEKS = 1;
    private static final int COHORT_MAX_WEEKS = 26;

    private final AnalyticsFunnelRepository funnelRepository;
    private final AnalyticsUserFunnelRepository userFunnelRepository;
    private final AnalyticsKeywordRepository keywordRepository;
    private final AnalyticsSegmentRepository segmentRepository;
    private final AnalyticsJourneyRepository journeyRepository;
    private final AnalyticsAiPerformanceRepository aiPerformanceRepository;
    private final AnalyticsMatchingDiversityRepository matchingDiversityRepository;
    private final AnalyticsDiaryPatternRepository diaryPatternRepository;
    private final AnalyticsExchangePatternRepository exchangePatternRepository;
    private final AnalyticsSurvivalRepository survivalRepository;
    private final AnalyticsSegmentationRepository segmentationRepository;
    private final AnalyticsAssociationRepository associationRepository;
    private final AnalyticsCohortRepository cohortRepository;
    private final EntityManager entityManager;

    // =========================================================================
    // §18.1 매칭 퍼널 (B-1.1)
    // =========================================================================

    public MatchingFunnelResponse getMatchingFunnel(LocalDate startDate,
                                                    LocalDate endDate,
                                                    String gender) {
        LocalDate endExclusive = endDate.plusDays(1);
        String genderFilter = (gender == null || "ALL".equalsIgnoreCase(gender))
                ? null : gender.toUpperCase(Locale.ROOT);

        List<Object[]> rows = funnelRepository.aggregateDailyFunnel(startDate, endExclusive, genderFilter);

        List<DailyFunnelPoint> daily = new ArrayList<>(rows.size());
        long sumRecs = 0, sumAccepts = 0, sumExchanges = 0, sumCouples = 0;

        for (Object[] row : rows) {
            LocalDate d = toLocalDate(row[0]);
            long recs      = toLong(row[1]);
            long accepts   = toLong(row[2]);
            long exchanges = toLong(row[3]);
            long couples   = toLong(row[4]);

            daily.add(new DailyFunnelPoint(d, recs, accepts, exchanges, couples));

            sumRecs += recs;
            sumAccepts += accepts;
            sumExchanges += exchanges;
            sumCouples += couples;
        }

        StageTotals totals = new StageTotals(
                sumRecs, sumAccepts, sumExchanges, sumCouples,
                safeDivide(sumAccepts, sumRecs),
                safeDivide(sumExchanges, sumAccepts),
                safeDivide(sumCouples, sumExchanges));

        String worst = computeWorstDropoffStage(totals);

        return new MatchingFunnelResponse(
                new Period(startDate, endDate, TZ),
                genderFilter != null ? genderFilter : "ALL",
                daily,
                totals,
                worst,
                new Meta(K_ANON_MIN, false, "live"));
    }

    // =========================================================================
    // §3.2 사용자 퍼널·코호트 (B-1.2)
    // =========================================================================

    public UserFunnelResponse getUserFunnel(LocalDate startDate,
                                            LocalDate endDate,
                                            String cohort) {
        LocalDate endExclusive = endDate.plusDays(1);
        String cohortMode = (cohort == null || cohort.isBlank()) ? "signup_date" : cohort;

        List<UserFunnelResponse.CohortRow> cohortRows = new ArrayList<>();
        long totalSignups = 0;
        long totalCouples = 0;
        Map<String, Double> stageRatesSum = new HashMap<>();
        int matureCohortCount = 0;

        if ("first_match_date".equalsIgnoreCase(cohortMode)) {
            List<Object[]> rows = userFunnelRepository.aggregateByFirstMatchWeek(startDate, endExclusive);
            for (Object[] row : rows) {
                LocalDate week = toLocalDate(row[0]);
                long stage3 = toLong(row[1]);
                long stage4 = toLong(row[2]);
                long stage5 = toLong(row[3]);

                // match 를 모수로 두고 match→exchange→couple 3단 퍼널
                UserFunnelResponse.Stages stages = new UserFunnelResponse.Stages(
                        new UserFunnelResponse.StageCount(0L, null),
                        new UserFunnelResponse.StageCount(0L, null),
                        new UserFunnelResponse.StageCount(stage3, 1.0),
                        new UserFunnelResponse.StageCount(stage4, safeDivide(stage4, stage3)),
                        new UserFunnelResponse.StageCount(stage5, safeDivide(stage5, stage3)));

                UserFunnelResponse.Dropoff dropoff = new UserFunnelResponse.Dropoff(
                        null, null,
                        dropoffRate(stage3, stage4),
                        dropoffRate(stage4, stage5));

                long maturityDays = java.time.temporal.ChronoUnit.DAYS
                        .between(week, LocalDate.now());
                String label = maturityLabel(maturityDays);
                if ("MATURE".equals(label)) matureCohortCount++;

                cohortRows.add(new UserFunnelResponse.CohortRow(
                        week, week.plusDays(6), maturityDays, label, stages, dropoff));

                totalSignups += stage3;
                totalCouples += stage5;
                accumulateRate(stageRatesSum, "matchToExchange",  dropoff.matchToExchange());
                accumulateRate(stageRatesSum, "exchangeToCouple", dropoff.exchangeToCouple());
            }
        } else {
            List<Object[]> rows = userFunnelRepository.aggregateBySignupWeek(
                    startDate, endExclusive, PROFILE_DONE_STEP);
            for (Object[] row : rows) {
                LocalDate week = toLocalDate(row[0]);
                long stage1 = toLong(row[1]);
                long stage2 = toLong(row[2]);
                long stage3 = toLong(row[3]);
                long stage4 = toLong(row[4]);
                long stage5 = toLong(row[5]);

                UserFunnelResponse.Stages stages = new UserFunnelResponse.Stages(
                        new UserFunnelResponse.StageCount(stage1, 1.0),
                        new UserFunnelResponse.StageCount(stage2, safeDivide(stage2, stage1)),
                        new UserFunnelResponse.StageCount(stage3, safeDivide(stage3, stage1)),
                        new UserFunnelResponse.StageCount(stage4, safeDivide(stage4, stage1)),
                        new UserFunnelResponse.StageCount(stage5, safeDivide(stage5, stage1)));

                UserFunnelResponse.Dropoff dropoff = new UserFunnelResponse.Dropoff(
                        dropoffRate(stage1, stage2),
                        dropoffRate(stage2, stage3),
                        dropoffRate(stage3, stage4),
                        dropoffRate(stage4, stage5));

                long maturityDays = java.time.temporal.ChronoUnit.DAYS
                        .between(week, LocalDate.now());
                String label = maturityLabel(maturityDays);
                if ("MATURE".equals(label)) matureCohortCount++;

                cohortRows.add(new UserFunnelResponse.CohortRow(
                        week, week.plusDays(6), maturityDays, label, stages, dropoff));

                totalSignups += stage1;
                totalCouples += stage5;
                accumulateRate(stageRatesSum, "signupToProfile",  dropoff.signupToProfile());
                accumulateRate(stageRatesSum, "profileToMatch",   dropoff.profileToMatch());
                accumulateRate(stageRatesSum, "matchToExchange",  dropoff.matchToExchange());
                accumulateRate(stageRatesSum, "exchangeToCouple", dropoff.exchangeToCouple());
            }
        }

        Double overallConversion = safeDivide(totalCouples, totalSignups);
        String worstStage = stageRatesSum.entrySet().stream()
                .min(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);

        UserFunnelResponse.Summary summary = new UserFunnelResponse.Summary(
                totalSignups, overallConversion, worstStage);

        boolean degraded = matureCohortCount == 0 && !cohortRows.isEmpty();

        return new UserFunnelResponse(
                new UserFunnelResponse.Period(startDate, endDate, TZ),
                cohortMode,
                cohortRows,
                summary,
                new UserFunnelResponse.Meta(K_ANON_MIN, degraded, "live"));
    }

    // =========================================================================
    // §3.3 키워드 TopN (B-1.3)
    // =========================================================================

    public KeywordTopResponse getKeywordTop(LocalDate startDate,
                                            LocalDate endDate,
                                            String tagType,
                                            int limit) {
        LocalDate endExclusive = endDate.plusDays(1);
        String tagFilter = (tagType == null || tagType.isBlank() || "ALL".equalsIgnoreCase(tagType))
                ? null : tagType.toUpperCase(Locale.ROOT);
        int safeLimit = Math.min(Math.max(limit, 1), 200);

        List<Object[]> rows = keywordRepository.topKeywords(
                startDate, endExclusive, tagFilter, K_ANON_MIN, safeLimit);

        List<KeywordTopResponse.KeywordItem> items = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            String type = (String) row[0];
            String keyword = (String) row[1];
            long freq = toLong(row[2]);
            long diaryFreq = toLong(row[3]);
            long userFreq = toLong(row[4]);
            BigDecimal avg = toBigDecimal(row[5]);
            BigDecimal p50 = toBigDecimal(row[6]);
            BigDecimal p90 = toBigDecimal(row[7]);
            int rank = (int) toLong(row[8]);

            items.add(new KeywordTopResponse.KeywordItem(
                    type, keyword, freq, diaryFreq, userFreq, avg, p50, p90, rank));
        }

        return new KeywordTopResponse(
                new KeywordTopResponse.Period(startDate, endDate, TZ),
                tagFilter,
                items,
                K_ANON_MIN,
                new KeywordTopResponse.Meta(false, "live"));
    }

    // =========================================================================
    // §3.4 세그먼트 Overview (B-1.4)
    // =========================================================================

    public SegmentOverviewResponse getSegmentOverview(LocalDate startDate,
                                                      LocalDate endDate,
                                                      String metric,
                                                      List<String> groupBy) {
        LocalDate endExclusive = endDate.plusDays(1);
        String metricUpper = (metric == null || metric.isBlank())
                ? "SIGNUP" : metric.toUpperCase(Locale.ROOT);
        List<String> groupByNormalized = (groupBy == null || groupBy.isEmpty())
                ? List.of("gender", "ageGroup") : groupBy;

        boolean byGender = groupByNormalized.contains("gender");
        boolean byAge    = groupByNormalized.contains("ageGroup");
        boolean byRegion = groupByNormalized.contains("regionCode");

        List<Object[]> rows = segmentRepository.aggregateSegments(
                startDate, endExclusive, metricUpper, byGender, byAge, byRegion);

        List<SegmentOverviewResponse.SegmentRow> segments = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            String g = (String) row[0];
            String a = (String) row[1];
            String r = (String) row[2];
            long users = toLong(row[3]);
            long num = toLong(row[4]);
            long den = toLong(row[5]);

            boolean masked = users < K_ANON_MIN;
            Double value = null;
            if (!masked) {
                value = switch (metricUpper) {
                    case "DIARY", "ACCEPT" -> safeDivide(num, den);
                    default -> (double) num;
                };
            }

            segments.add(new SegmentOverviewResponse.SegmentRow(
                    g, a, r, users, value, masked, masked ? "k<" + K_ANON_MIN : null));
        }

        return new SegmentOverviewResponse(
                new SegmentOverviewResponse.Period(startDate, endDate, TZ),
                metricUpper,
                groupByNormalized,
                segments,
                K_ANON_MIN,
                new SegmentOverviewResponse.Meta(false, "live"));
    }

    // =========================================================================
    // §3.5 여정 분포 (B-1.5) — Fallback 모드
    // =========================================================================

    public JourneyDurationResponse getJourneyDurations(LocalDate startDate,
                                                       LocalDate endDate) {
        LocalDate endExclusive = endDate.plusDays(1);
        List<Object[]> rows = journeyRepository.aggregateStageDurations(startDate, endExclusive);

        List<JourneyDurationResponse.StageStat> stats = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            String stage = (String) row[0];
            long n = toLong(row[1]);
            Double p50 = toDouble(row[2]);
            Double p90 = toDouble(row[3]);
            Double p99 = toDouble(row[4]);
            Double mean = toDouble(row[5]);
            Double stddev = toDouble(row[6]);

            stats.add(new JourneyDurationResponse.StageStat(stage, n, p50, p90, p99, mean, stddev));
        }

        return new JourneyDurationResponse(
                new JourneyDurationResponse.Period(startDate, endDate, TZ),
                stats,
                true,   // degraded — PROFILE_COMPLETED 이벤트 미적재로 modified_at 근사 사용 중
                true,   // fallbackUsed — user_activity_events 스트림 대신 원천 테이블 조인
                new JourneyDurationResponse.Meta("fallback-sql"));
    }

    // =========================================================================
    // §3.6 AI 성능 (B-1.6) — DB Fallback
    // =========================================================================

    public AiPerformanceResponse getAiPerformance(LocalDateTime startTs,
                                                  LocalDateTime endTs) {
        Object[] diaryRow = aiPerformanceRepository.aggregateDiaryAnalysis(startTs, endTs);
        long completed = toLong(diaryRow[0]);
        long failed = toLong(diaryRow[1]);
        long totalEvents = completed + failed;
        Double failRate = safeDivide(failed, totalEvents);

        Object[] lifestyleSummary = aiPerformanceRepository.aggregateLifestyleAnalysisSummary(startTs, endTs);
        long totalRuns = toLong(lifestyleSummary[0]);
        Double avgDiaryCount = toDouble(lifestyleSummary[1]);

        List<Object[]> dailyRows = aiPerformanceRepository.aggregateLifestyleDaily(startTs, endTs);
        List<AiPerformanceResponse.DailyBucket> dailyBuckets = new ArrayList<>(dailyRows.size());
        for (Object[] row : dailyRows) {
            dailyBuckets.add(new AiPerformanceResponse.DailyBucket(toLocalDate(row[0]), toLong(row[1])));
        }

        return new AiPerformanceResponse(
                new AiPerformanceResponse.Period(startTs, endTs, TZ),
                new AiPerformanceResponse.DiaryAnalysis(completed, failed, failRate, totalEvents),
                new AiPerformanceResponse.LifestyleAnalysis(totalRuns, avgDiaryCount, dailyBuckets),
                true,
                new AiPerformanceResponse.Meta(
                        "user_activity_events + lifestyle_analysis_log",
                        "P95 latency 등 심층 지표는 Prometheus 측 dashboard 참조"));
    }

    // =========================================================================
    // §3.7 매칭 통계 보조 (B-1.7)
    // =========================================================================

    public MatchingDiversityResponse getMatchingDiversity(LocalDate startDate,
                                                           LocalDate endDate) {
        LocalDateTime startTs = startDate.atStartOfDay();
        LocalDateTime endTs = endDate.plusDays(1).atStartOfDay();

        Object[] row = matchingDiversityRepository.aggregateDiversity(
                startTs, endTs, RERECOMMENDATION_WINDOW_DAYS);

        long totalRecs = toLong(row[0]);
        long uniqueCandidates = toLong(row[1]);
        Double shannon = toDouble(row[2]);
        long rerec = toLong(row[3]);
        Double rerecRate = safeDivide(rerec, totalRecs);

        return new MatchingDiversityResponse(
                new MatchingDiversityResponse.Period(startDate, endDate, TZ),
                totalRecs, uniqueCandidates, shannon, rerec, rerecRate,
                new MatchingDiversityResponse.Meta(RERECOMMENDATION_WINDOW_DAYS, "live"));
    }

    // =========================================================================
    // §3.8 일기 시간 히트맵 (B-2.1)
    // =========================================================================

    public DiaryTimeHeatmapResponse getDiaryTimeHeatmap(LocalDate startDate, LocalDate endDate) {
        LocalDate endExclusive = endDate.plusDays(1);
        List<Object[]> rows = diaryPatternRepository.aggregateTimeHeatmap(startDate, endExclusive);

        List<DiaryTimeHeatmapResponse.HeatmapCell> cells = new ArrayList<>(rows.size());
        long totalDiaries = 0;
        long peakCount = -1;
        Integer peakDow = null;
        Integer peakHour = null;

        for (Object[] row : rows) {
            int dow = (int) toLong(row[0]);
            int hour = (int) toLong(row[1]);
            long cnt = toLong(row[2]);

            cells.add(new DiaryTimeHeatmapResponse.HeatmapCell(dow, hour, cnt));
            totalDiaries += cnt;
            if (cnt > peakCount) {
                peakCount = cnt;
                peakDow = dow;
                peakHour = hour;
            }
        }

        return new DiaryTimeHeatmapResponse(
                new DiaryTimeHeatmapResponse.Period(startDate, endDate, TZ),
                cells, totalDiaries, peakDow, peakHour,
                new DiaryTimeHeatmapResponse.Meta(K_ANON_MIN, DATA_SOURCE_V2));
    }

    // =========================================================================
    // §3.9 일기 길이·품질 (B-2.2)
    // =========================================================================

    public DiaryLengthQualityResponse getDiaryLengthQuality(LocalDate startDate, LocalDate endDate) {
        LocalDate endExclusive = endDate.plusDays(1);
        Object[] row = diaryPatternRepository.aggregateLengthAndQuality(startDate, endExclusive);

        long total = toLong(row[0]);
        Double mean = toDouble(row[1]);
        Double p50 = toDouble(row[2]);
        Double p90 = toDouble(row[3]);
        Double p99 = toDouble(row[4]);
        Long min = total == 0 ? null : toLong(row[5]);
        Long max = total == 0 ? null : toLong(row[6]);

        List<DiaryLengthQualityResponse.LengthBucket> histogram = List.of(
                new DiaryLengthQualityResponse.LengthBucket("100-199",  toLong(row[7])),
                new DiaryLengthQualityResponse.LengthBucket("200-399",  toLong(row[8])),
                new DiaryLengthQualityResponse.LengthBucket("400-799",  toLong(row[9])),
                new DiaryLengthQualityResponse.LengthBucket("800-1499", toLong(row[10])),
                new DiaryLengthQualityResponse.LengthBucket("1500+",    toLong(row[11]))
        );

        long completed = toLong(row[12]);
        long failed    = toLong(row[13]);
        long skipped   = toLong(row[14]);
        long pending   = toLong(row[15]);
        Double successRate = safeDivide(completed, completed + failed);

        return new DiaryLengthQualityResponse(
                new DiaryLengthQualityResponse.Period(startDate, endDate, TZ),
                new DiaryLengthQualityResponse.LengthStats(total, mean, p50, p90, p99, min, max),
                histogram,
                new DiaryLengthQualityResponse.QualityStats(completed, failed, skipped, pending, successRate),
                new DiaryLengthQualityResponse.Meta(K_ANON_MIN, DATA_SOURCE_V2));
    }

    // =========================================================================
    // §3.10 감정 태그 추이 시계열 (B-2.3)
    // =========================================================================

    public DiaryEmotionTrendResponse getDiaryEmotionTrends(LocalDate startDate,
                                                           LocalDate endDate,
                                                           String bucket,
                                                           int topN) {
        LocalDate endExclusive = endDate.plusDays(1);
        String unit = (bucket == null || bucket.isBlank()) ? "day" : bucket.toLowerCase(Locale.ROOT);
        int safeTopN = Math.min(Math.max(topN, 1), 20);

        List<Object[]> rows = diaryPatternRepository.aggregateEmotionTrends(
                startDate, endExclusive, unit, safeTopN);
        List<DiaryEmotionTrendResponse.TrendPoint> points = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            points.add(new DiaryEmotionTrendResponse.TrendPoint(
                    toLocalDate(r[0]),
                    (String) r[1],
                    toLong(r[2]),
                    toBigDecimal(r[3])));
        }

        List<Object> topRows = diaryPatternRepository.aggregateTopEmotions(
                startDate, endExclusive, safeTopN);
        List<String> topEmotions = new ArrayList<>(topRows.size());
        for (Object o : topRows) {
            if (o != null) topEmotions.add(o.toString());
        }

        return new DiaryEmotionTrendResponse(
                new DiaryEmotionTrendResponse.Period(startDate, endDate, TZ),
                unit, points, topEmotions,
                new DiaryEmotionTrendResponse.Meta(K_ANON_MIN, DATA_SOURCE_V2));
    }

    // =========================================================================
    // §3.11 주제(카테고리) 참여도 (B-2.4)
    // =========================================================================

    public DiaryTopicParticipationResponse getDiaryTopicParticipation(LocalDate startDate,
                                                                     LocalDate endDate) {
        LocalDate endExclusive = endDate.plusDays(1);

        Object[] totals = diaryPatternRepository.aggregateTopicTotals(startDate, endExclusive);
        long totalDiaries = toLong(totals[0]);
        long totalUsers = toLong(totals[1]);

        List<Object[]> rows = diaryPatternRepository.aggregateTopicParticipation(startDate, endExclusive);
        List<DiaryTopicParticipationResponse.TopicRow> topics = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            String category = (String) r[0];
            long diaryCnt = toLong(r[1]);
            long userCnt = toLong(r[2]);
            topics.add(new DiaryTopicParticipationResponse.TopicRow(
                    category, diaryCnt, userCnt,
                    safeDivide(diaryCnt, totalDiaries),
                    safeDivide(userCnt, totalUsers)));
        }

        return new DiaryTopicParticipationResponse(
                new DiaryTopicParticipationResponse.Period(startDate, endDate, TZ),
                totalDiaries, totalUsers, topics,
                new DiaryTopicParticipationResponse.Meta(K_ANON_MIN, DATA_SOURCE_V2));
    }

    // =========================================================================
    // §3.12 교환일기 응답률 (B-2.5)
    // =========================================================================

    public ExchangeResponseRateResponse getExchangeResponseRate(LocalDate startDate,
                                                                LocalDate endDate,
                                                                int windowHours) {
        LocalDate endExclusive = endDate.plusDays(1);
        int safeWindow = Math.min(Math.max(windowHours, 1), 168); // 1시간 ~ 1주일 제한

        Object[] firstRate = exchangePatternRepository.aggregateFirstResponseRate(
                startDate, endExclusive, safeWindow);
        long started = toLong(firstRate[0]);
        long responded = toLong(firstRate[1]);
        Double rate = safeDivide(responded, started);

        Object[] delay = exchangePatternRepository.aggregateResponseDelay(startDate, endExclusive);
        ExchangeResponseRateResponse.ResponseDelay respDelay = new ExchangeResponseRateResponse.ResponseDelay(
                toDouble(delay[0]), toDouble(delay[1]), toDouble(delay[2]), toDouble(delay[3]));

        List<Object[]> transRows = exchangePatternRepository.aggregateTurnTransitions(
                startDate, endExclusive);
        List<ExchangeResponseRateResponse.TurnResponseRow> byTurn = new ArrayList<>(transRows.size());
        for (Object[] r : transRows) {
            int fromTurn = (int) toLong(r[0]);
            int toTurn = (int) toLong(r[1]);
            long samples = toLong(r[2]);
            Double turnRate = toDouble(r[3]);
            Double p50 = toDouble(r[4]);
            byTurn.add(new ExchangeResponseRateResponse.TurnResponseRow(
                    fromTurn, toTurn, samples, turnRate, p50));
        }

        return new ExchangeResponseRateResponse(
                new ExchangeResponseRateResponse.Period(startDate, endDate, TZ),
                safeWindow, started, responded, rate, respDelay, byTurn,
                new ExchangeResponseRateResponse.Meta(K_ANON_MIN, DATA_SOURCE_V2));
    }

    // =========================================================================
    // §3.13 턴→채팅 전환 퍼널 (B-2.6)
    // =========================================================================

    public ExchangeTurnFunnelResponse getExchangeTurnFunnel(LocalDate startDate, LocalDate endDate) {
        LocalDate endExclusive = endDate.plusDays(1);
        Object[] row = exchangePatternRepository.aggregateTurnFunnel(startDate, endExclusive);

        long roomsCreated = toLong(row[0]);
        long turn1        = toLong(row[1]);
        long turn2        = toLong(row[2]);
        long turn3        = toLong(row[3]);
        long turn4        = toLong(row[4]);
        long chat         = toLong(row[5]);

        List<ExchangeTurnFunnelResponse.FunnelStage> stages = new ArrayList<>(6);
        stages.add(new ExchangeTurnFunnelResponse.FunnelStage(
                "ROOM_CREATED", roomsCreated, null, 1.0));
        stages.add(new ExchangeTurnFunnelResponse.FunnelStage(
                "TURN_1", turn1, safeDivide(turn1, roomsCreated), safeDivide(turn1, roomsCreated)));
        stages.add(new ExchangeTurnFunnelResponse.FunnelStage(
                "TURN_2", turn2, safeDivide(turn2, turn1), safeDivide(turn2, roomsCreated)));
        stages.add(new ExchangeTurnFunnelResponse.FunnelStage(
                "TURN_3", turn3, safeDivide(turn3, turn2), safeDivide(turn3, roomsCreated)));
        stages.add(new ExchangeTurnFunnelResponse.FunnelStage(
                "TURN_4_COMPLETE", turn4, safeDivide(turn4, turn3), safeDivide(turn4, roomsCreated)));
        stages.add(new ExchangeTurnFunnelResponse.FunnelStage(
                "CHAT_CONNECTED", chat, safeDivide(chat, turn4), safeDivide(chat, roomsCreated)));

        String worst = null;
        double worstRate = Double.MAX_VALUE;
        for (int i = 1; i < stages.size(); i++) {
            Double sr = stages.get(i).stepRate();
            if (sr != null && sr < worstRate) {
                worstRate = sr;
                worst = stages.get(i).name();
            }
        }

        return new ExchangeTurnFunnelResponse(
                new ExchangeTurnFunnelResponse.Period(startDate, endDate, TZ),
                stages,
                safeDivide(chat, roomsCreated),
                worst,
                new ExchangeTurnFunnelResponse.Meta(K_ANON_MIN, DATA_SOURCE_V2));
    }

    // =========================================================================
    // §3.14 사용자 이탈 생존분석 Kaplan-Meier (B-2.7)
    // =========================================================================

    public RetentionSurvivalResponse getRetentionSurvival(LocalDate startDate,
                                                          LocalDate endDate,
                                                          int inactivityThresholdDays) {
        LocalDate endExclusive = endDate.plusDays(1);
        int threshold = Math.min(Math.max(inactivityThresholdDays, 7), 180);

        Object[] cohort = survivalRepository.aggregateCohortStats(startDate, endExclusive, threshold);
        long cohortSize = toLong(cohort[0]);
        long events = toLong(cohort[1]);
        long censored = toLong(cohort[2]);

        List<Object[]> rows = survivalRepository.aggregateSurvivalPoints(
                startDate, endExclusive, threshold);

        // Kaplan-Meier S(t) 누적 곱 + Greenwood 분산 누적 합 계산.
        List<RetentionSurvivalResponse.SurvivalPoint> curve = new ArrayList<>(rows.size());
        double cumulativeLogS = 0.0;
        double greenwoodSum = 0.0;
        Integer medianDay = null;

        for (Object[] r : rows) {
            int day = (int) toLong(r[0]);
            long atRisk = toLong(r[1]);
            long d = toLong(r[2]);

            if (atRisk <= 0) continue;
            double survivalAtThisStep;
            if (d >= atRisk) {
                survivalAtThisStep = 0.0;
            } else {
                survivalAtThisStep = 1.0 - (double) d / (double) atRisk;
            }

            if (survivalAtThisStep > 0.0) {
                cumulativeLogS += Math.log(survivalAtThisStep);
            } else {
                cumulativeLogS = Double.NEGATIVE_INFINITY;
            }
            double st = Math.exp(cumulativeLogS);

            // Greenwood: Σ d_i / (n_i * (n_i - d_i)) — n=d 인 경우 항이 정의되지 않으니 스킵.
            if (atRisk > d) {
                greenwoodSum += (double) d / ((double) atRisk * (double) (atRisk - d));
            }
            double variance = st * st * greenwoodSum;
            double stdError = Math.sqrt(Math.max(variance, 0.0));
            double ciLower = Math.max(0.0, st - Z_95 * stdError);
            double ciUpper = Math.min(1.0, st + Z_95 * stdError);

            if (medianDay == null && st <= 0.5) {
                medianDay = day;
            }

            curve.add(new RetentionSurvivalResponse.SurvivalPoint(
                    day, atRisk, d, st, stdError, ciLower, ciUpper));
        }

        return new RetentionSurvivalResponse(
                new RetentionSurvivalResponse.Period(startDate, endDate, TZ),
                threshold, cohortSize, events, censored, medianDay, curve,
                new RetentionSurvivalResponse.Meta(
                        "kaplan-meier-greenwood",
                        "deactivated_at OR last_login_at < NOW() - " + threshold + "d",
                        true, // user_activity_events 미활용 fallback
                        DATA_SOURCE_V2));
    }

    // =========================================================================
    // §3.15 사용자 세그먼테이션 RFM + K-Means (B-3)
    // =========================================================================

    /**
     * 사용자 세그먼테이션 — RFM Quintile 과 K-Means Clustering 이중 제공.
     *
     * @param method "RFM" | "KMEANS" | "BOTH" (기본 BOTH)
     * @param k      K-Means 클러스터 수 (2~10 범위, 기본 5)
     */
    public UserSegmentationResponse getUserSegmentation(LocalDate startDate,
                                                        LocalDate endDate,
                                                        String method,
                                                        int k) {
        LocalDate endExclusive = endDate.plusDays(1);
        String methodUpper = (method == null || method.isBlank())
                ? "BOTH" : method.toUpperCase(Locale.ROOT);
        if (!"RFM".equals(methodUpper) && !"KMEANS".equals(methodUpper) && !"BOTH".equals(methodUpper)) {
            methodUpper = "BOTH";
        }
        int safeK = Math.min(Math.max(k, SEGMENTATION_MIN_K), SEGMENTATION_MAX_K);

        // 1) RFE 벡터 추출
        List<Object[]> rows = segmentationRepository.aggregateRfeVectors(startDate, endExclusive);
        int n = rows.size();
        long[] userIds = new long[n];
        double[][] features = new double[n][3];
        for (int i = 0; i < n; i++) {
            Object[] r = rows.get(i);
            userIds[i] = toLong(r[0]);
            features[i][0] = nullableDouble(r[1]);  // recency
            features[i][1] = nullableDouble(r[2]);  // frequency
            features[i][2] = nullableDouble(r[3]);  // engagement
        }

        // 2) RFM Quintile
        UserSegmentationResponse.RfmSummary rfmSummary = null;
        if ("RFM".equals(methodUpper) || "BOTH".equals(methodUpper)) {
            rfmSummary = computeRfmQuintile(features);
        }

        // 3) K-Means
        UserSegmentationResponse.KMeansSummary kmeansSummary = null;
        if ("KMEANS".equals(methodUpper) || "BOTH".equals(methodUpper)) {
            kmeansSummary = computeKMeans(features, safeK);
        }

        return new UserSegmentationResponse(
                new UserSegmentationResponse.Period(startDate, endDate, TZ),
                methodUpper, safeK, n,
                rfmSummary, kmeansSummary,
                new UserSegmentationResponse.Meta(
                        "rfm-quintile + k-means-lloyd",
                        K_ANON_MIN,
                        false,
                        DATA_SOURCE_V2));
    }

    /**
     * RFM Quintile 분할 — 각 차원 NTILE(5) → 5개 행동 세그먼트 라벨링.
     *
     * 라벨링 규칙 (간소화):
     *   - CHAMPIONS:  R∈{4,5} AND F∈{4,5} AND E∈{4,5}
     *   - LOYAL:      F∈{4,5} AND E∈{3,4,5} (CHAMPIONS 제외)
     *   - PROMISING:  R∈{4,5} (신규·재방문) — CHAMPIONS/LOYAL 제외
     *   - AT_RISK:    R∈{2,3} AND F∈{3,4,5}
     *   - LOST:       그 외
     */
    private UserSegmentationResponse.RfmSummary computeRfmQuintile(double[][] features) {
        int n = features.length;
        int[] rScore = quintileScore(features, 0, /*reverse=*/ true);  // Recency 는 낮을수록 좋음 → 역순
        int[] fScore = quintileScore(features, 1, /*reverse=*/ false);
        int[] eScore = quintileScore(features, 2, /*reverse=*/ false);

        java.util.Map<String, long[]> buckets = new java.util.LinkedHashMap<>();
        buckets.put("CHAMPIONS", new long[]{0});
        buckets.put("LOYAL",     new long[]{0});
        buckets.put("PROMISING", new long[]{0});
        buckets.put("AT_RISK",   new long[]{0});
        buckets.put("LOST",      new long[]{0});

        double[] sumR = new double[5], sumF = new double[5], sumE = new double[5];
        String[] labels = {"CHAMPIONS","LOYAL","PROMISING","AT_RISK","LOST"};

        for (int i = 0; i < n; i++) {
            int r = rScore[i], f = fScore[i], e = eScore[i];
            int idx;
            if (r >= 4 && f >= 4 && e >= 4) idx = 0;           // CHAMPIONS
            else if (f >= 4 && e >= 3)       idx = 1;           // LOYAL
            else if (r >= 4)                 idx = 2;           // PROMISING
            else if (r >= 2 && f >= 3)       idx = 3;           // AT_RISK
            else                              idx = 4;           // LOST

            buckets.get(labels[idx])[0]++;
            sumR[idx] += features[i][0];
            sumF[idx] += features[i][1];
            sumE[idx] += features[i][2];
        }

        List<UserSegmentationResponse.RfmSegment> segments = new ArrayList<>(5);
        for (int idx = 0; idx < 5; idx++) {
            long size = buckets.get(labels[idx])[0];
            boolean masked = size < K_ANON_MIN;
            Double avgR = size == 0 ? null : sumR[idx] / size;
            Double avgF = size == 0 ? null : sumF[idx] / size;
            Double avgE = size == 0 ? null : sumE[idx] / size;
            Double share = n > 0 ? (double) size / n : null;
            segments.add(new UserSegmentationResponse.RfmSegment(
                    labels[idx], size, masked, avgR, avgF, avgE, share));
        }

        List<String> notes = List.of(
                "R(Recency): 마지막 활동 후 경과일 — 낮을수록 높은 점수",
                "F(Frequency): 기간 내 일기 작성 수",
                "E(Engagement): 교환일기 × 2 + AI 완료 일기 × 1",
                "CHAMPIONS: R≥4 AND F≥4 AND E≥4",
                "LOYAL: F≥4 AND E≥3 (CHAMPIONS 제외)",
                "PROMISING: R≥4 (신규·재방문, 위 둘 제외)",
                "AT_RISK: R∈{2,3} AND F≥3",
                "LOST: 그 외"
        );
        return new UserSegmentationResponse.RfmSummary(segments, notes);
    }

    /**
     * NTILE(5) 점수 계산 — 각 feature 의 값 정렬 후 5분위로 1~5 점수 부여.
     *
     * @param reverse true 면 낮은 값이 높은 점수 (Recency 용)
     */
    private static int[] quintileScore(double[][] features, int col, boolean reverse) {
        int n = features.length;
        if (n == 0) return new int[0];

        Integer[] indices = new Integer[n];
        for (int i = 0; i < n; i++) indices[i] = i;
        java.util.Arrays.sort(indices, (a, b) -> Double.compare(features[a][col], features[b][col]));

        int[] score = new int[n];
        for (int rank = 0; rank < n; rank++) {
            int rawScore = 1 + (rank * 5 / Math.max(n, 1)); // 1~5
            if (rawScore > 5) rawScore = 5;
            int bucket = reverse ? (6 - rawScore) : rawScore;
            score[indices[rank]] = bucket;
        }
        return score;
    }

    /**
     * K-Means 수행 → 클러스터별 요약으로 변환.
     */
    private UserSegmentationResponse.KMeansSummary computeKMeans(double[][] features, int k) {
        KMeansAlgorithm.Result result = KMeansAlgorithm.run(
                features, k, KMEANS_MAX_ITER, KMEANS_TOLERANCE, KMEANS_SEED);

        int actualK = result.centroidsRaw().length;
        long[] sizes = new long[actualK];
        for (int assignment : result.assignments()) sizes[assignment]++;

        List<UserSegmentationResponse.Cluster> clusters = new ArrayList<>(actualK);
        for (int c = 0; c < actualK; c++) {
            double[] raw = result.centroidsRaw()[c];
            double[] z = result.centroidsZ()[c];
            String label = labelCluster(z);   // Z-score 기반 의미 라벨
            boolean masked = sizes[c] < K_ANON_MIN;

            clusters.add(new UserSegmentationResponse.Cluster(
                    c, label, sizes[c], masked,
                    raw[0], raw[1], raw[2],
                    z[0],   z[1],   z[2],
                    result.avgDistancePerCluster()[c]));
        }

        return new UserSegmentationResponse.KMeansSummary(
                clusters, result.iterations(), result.inertia(),
                result.converged(), result.tolerance(), result.seed());
    }

    /**
     * K-Means 클러스터의 Z-score centroid 기반 자동 라벨링 휴리스틱.
     * RFM quintile 과 의미를 맞추되, K-Means 가 다른 K 값을 가질 수 있어 설명형 라벨 부여.
     */
    private static String labelCluster(double[] z) {
        double r = z[0], f = z[1], e = z[2];
        if (f > 0.5 && e > 0.5 && r < 0)        return "HIGH_ENGAGEMENT";
        if (f > 0 && e > 0)                     return "ACTIVE";
        if (r > 0.5 && f < 0)                   return "CHURNING";
        if (r > 1.0 && f < -0.5 && e < -0.5)    return "DORMANT";
        if (f < -0.5 && e < -0.5)               return "LOW_ENGAGEMENT";
        return "BASELINE";
    }

    private static double nullableDouble(Object o) {
        Double d = toDouble(o);
        return d == null ? 0.0 : d;
    }

    // =========================================================================
    // §3.16 연관 규칙 마이닝 Apriori (B-4)
    // =========================================================================

    /**
     * 일기 태그 연관 규칙 마이닝.
     *
     * @param tagTypes      마이닝에 포함할 tag_type 목록. null/empty 면 전체 tag_type.
     * @param minSupport    지지도 임계값 (0.001~0.5 범위 클램프)
     * @param minConfidence 신뢰도 임계값 (0.05~0.99 범위 클램프)
     * @param minLift       lift 임계값 (1.0~5.0 범위 클램프)
     * @param maxItemsetSize 탐색 상한 k (2~3)
     */
    public AssociationRulesResponse getDiaryAssociationRules(LocalDate startDate,
                                                             LocalDate endDate,
                                                             List<String> tagTypes,
                                                             Double minSupport,
                                                             Double minConfidence,
                                                             Double minLift,
                                                             Integer maxItemsetSize) {
        LocalDate endExclusive = endDate.plusDays(1);
        double support = clamp(minSupport == null ? APRIORI_DEFAULT_MIN_SUPPORT : minSupport, 0.001d, 0.5d);
        double confidence = clamp(minConfidence == null ? APRIORI_DEFAULT_MIN_CONFIDENCE : minConfidence, 0.05d, 0.99d);
        double lift = clamp(minLift == null ? APRIORI_DEFAULT_MIN_LIFT : minLift, 1.0d, 5.0d);
        int maxK = Math.min(Math.max(maxItemsetSize == null ? APRIORI_DEFAULT_MAX_K : maxItemsetSize, 2), 3);

        List<String> normalizedTagTypes = (tagTypes == null || tagTypes.isEmpty())
                ? List.of("EMOTION", "LIFESTYLE", "TONE", "RELATIONSHIP_STYLE")
                : tagTypes.stream()
                        .filter(s -> s != null && !s.isBlank())
                        .map(s -> s.toUpperCase(Locale.ROOT))
                        .distinct()
                        .toList();

        // 1) 일기별 태그 집합 구성 (transaction DB)
        List<Object[]> rows = associationRepository.fetchDiaryTagRows(
                startDate, endExclusive, normalizedTagTypes);
        Map<Long, Set<String>> transactions = new HashMap<>();
        for (Object[] row : rows) {
            long diaryId = toLong(row[0]);
            String item = (String) row[1];
            if (item == null) continue;
            transactions.computeIfAbsent(diaryId, id -> new HashSet<>()).add(item);
        }
        List<Set<String>> txList = new ArrayList<>(transactions.values());

        long totalItemsDistinct = txList.stream()
                .flatMap(Set::stream)
                .distinct()
                .count();

        // 2) Apriori 실행
        AprioriAlgorithm.Result result = AprioriAlgorithm.run(
                txList, support, confidence, lift, maxK);

        // 3) DTO 조립
        List<AssociationRulesResponse.FrequentItemset> frequentItemsets = result.frequentItemsets().entrySet().stream()
                .map(e -> new AssociationRulesResponse.FrequentItemset(
                        e.getKey(), e.getValue(),
                        result.totalTransactions() == 0 ? 0.0 : (double) e.getValue() / result.totalTransactions()))
                .sorted((a, b) -> {
                    int c = Integer.compare(a.items().size(), b.items().size());
                    if (c != 0) return c;
                    return Double.compare(b.support(), a.support());
                })
                .limit(APRIORI_ITEMSETS_LIMIT)
                .toList();

        List<AssociationRulesResponse.Rule> rules = result.rules().stream()
                .limit(APRIORI_RULES_LIMIT)
                .map(r -> new AssociationRulesResponse.Rule(
                        r.antecedent(), r.consequent(),
                        r.count(), r.support(), r.confidence(), r.lift()))
                .toList();

        AssociationRulesResponse.Params params = new AssociationRulesResponse.Params(
                support, confidence, lift, maxK, normalizedTagTypes);

        AssociationRulesResponse.Stats stats = new AssociationRulesResponse.Stats(
                result.l1Count(), result.l2Count(), result.l3Count(),
                result.rules().size(), result.candidatesPruned());

        return new AssociationRulesResponse(
                new AssociationRulesResponse.Period(startDate, endDate, TZ),
                result.totalTransactions(),
                totalItemsDistinct,
                params,
                stats,
                frequentItemsets,
                rules,
                new AssociationRulesResponse.Meta(
                        "apriori", K_ANON_MIN, false, DATA_SOURCE_V2));
    }

    private static double clamp(double v, double min, double max) {
        return Math.max(min, Math.min(max, v));
    }

    // =========================================================================
    // §3.17 코호트 리텐션 매트릭스 (B-5)
    // =========================================================================

    /**
     * 주 단위 signup 코호트 × 가입 후 경과 주 별 리텐션 매트릭스.
     *
     * 설계 개요:
     *   - cohort_week          : DATE_TRUNC('week', created_at AT TIME ZONE 'Asia/Seoul') (월요일)
     *   - activity             : diaries.created_at OR exchange_diaries.submitted_at
     *   - week_offset          : FLOOR((activity_at - cohort_week 월요일 00:00 KST) / 7days)
     *   - retained[offset]     : 해당 코호트 중 week_offset 에 활동한 DISTINCT user 수
     *   - rate                 : retained / cohort_size
     *   - observable           : (cohort_week + (offset+1)*7) <= today. 미관측 셀은 null.
     *
     * averageByWeek: 관측 가능한 코호트만 평균에 포함 (maturity bias 방지).
     */
    public CohortRetentionResponse getCohortRetention(LocalDate startDate,
                                                      LocalDate endDate,
                                                      int maxWeeks) {
        LocalDate endExclusive = endDate.plusDays(1);
        int safeMaxWeeks = Math.min(Math.max(maxWeeks, COHORT_MIN_WEEKS), COHORT_MAX_WEEKS);

        // 1) 코호트 크기 (signup_week -> size)
        Map<LocalDate, Long> cohortSizes = new LinkedHashMap<>();
        for (Object[] r : cohortRepository.aggregateCohortSizes(startDate, endExclusive)) {
            cohortSizes.put(toLocalDate(r[0]), toLong(r[1]));
        }

        // 2) 코호트×offset -> retained
        Map<LocalDate, Map<Integer, Long>> retentionMap = new HashMap<>();
        for (Object[] r : cohortRepository.aggregateRetentionCounts(
                startDate, endExclusive, safeMaxWeeks)) {
            LocalDate cw = toLocalDate(r[0]);
            int offset = (int) toLong(r[1]);
            long retained = toLong(r[2]);
            retentionMap.computeIfAbsent(cw, k -> new HashMap<>()).put(offset, retained);
        }

        // 3) 매트릭스 조립 + 관측 가능 체크 + 평균 누적
        LocalDate today = LocalDate.now();
        double[] avgSum = new double[safeMaxWeeks];
        int[] observableCnt = new int[safeMaxWeeks];
        List<CohortRetentionResponse.CohortRow> rows = new ArrayList<>(cohortSizes.size());

        for (Map.Entry<LocalDate, Long> e : cohortSizes.entrySet()) {
            LocalDate cw = e.getKey();
            long size = e.getValue();
            Map<Integer, Long> retained = retentionMap.getOrDefault(cw, Collections.emptyMap());

            List<CohortRetentionResponse.RetentionCell> cells = new ArrayList<>(safeMaxWeeks);
            for (int offset = 0; offset < safeMaxWeeks; offset++) {
                // 주 구간이 today 까지 완전히 경과했는지: cohort_week + (offset+1)*7 <= today
                LocalDate weekEnd = cw.plusWeeks(offset + 1L);
                boolean observable = !weekEnd.isAfter(today);
                Long retainedCount = observable ? retained.getOrDefault(offset, 0L) : null;
                Double rate = (observable && size > 0)
                        ? (double) retainedCount / (double) size : null;
                cells.add(new CohortRetentionResponse.RetentionCell(
                        offset, retainedCount, rate, observable));
                if (rate != null) {
                    avgSum[offset] += rate;
                    observableCnt[offset]++;
                }
            }
            rows.add(new CohortRetentionResponse.CohortRow(
                    cw, cw.plusDays(6), size, cells));
        }

        // 4) 주차별 평균 리텐션 곡선
        List<CohortRetentionResponse.AverageByWeek> avgList = new ArrayList<>(safeMaxWeeks);
        for (int i = 0; i < safeMaxWeeks; i++) {
            Double avgRate = observableCnt[i] > 0 ? avgSum[i] / observableCnt[i] : null;
            avgList.add(new CohortRetentionResponse.AverageByWeek(
                    i, avgRate, observableCnt[i]));
        }

        long totalCohortUsers = cohortSizes.values().stream()
                .mapToLong(Long::longValue).sum();

        // degraded: 데이터가 없거나 전부 미관측인 경우
        boolean degraded = rows.isEmpty()
                || java.util.Arrays.stream(observableCnt).allMatch(c -> c == 0);

        return new CohortRetentionResponse(
                new CohortRetentionResponse.Period(startDate, endDate, TZ),
                safeMaxWeeks,
                cohortSizes.size(),
                totalCohortUsers,
                rows,
                avgList,
                new CohortRetentionResponse.Meta(
                        "cohort-retention-weekly", degraded, DATA_SOURCE_V2));
    }

    // =========================================================================
    // §18 이탈 타임라인 (3-H.1)
    // =========================================================================

    /**
     * 이탈 타임라인 — last_login_at 간격이 30일 초과인 사용자를 이탈로 간주.
     * 일별/주별 그룹화.
     */
    @SuppressWarnings("unchecked")
    public ChurnTimelineResponse getChurnTimeline(String period, String granularity) {
        int days = parsePeriodDays(period, 90);
        String gran = (granularity == null || granularity.isBlank()) ? "daily" : granularity.toLowerCase(Locale.ROOT);
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(days);

        String dateBucket = "weekly".equals(gran)
            ? "DATE_TRUNC('week', u.last_login_at AT TIME ZONE 'Asia/Seoul')::date"
            : "(u.last_login_at AT TIME ZONE 'Asia/Seoul')::date";

        String sql = """
            WITH churned AS (
              SELECT u.id, u.last_login_at,
                     %s AS churn_date
              FROM users u
              WHERE u.deleted_at IS NULL
                AND u.last_login_at IS NOT NULL
                AND u.last_login_at < NOW() - INTERVAL '30 days'
                AND u.last_login_at >= CAST(:start AS timestamp)
                AND u.last_login_at < CAST(:end AS timestamp)
            ),
            total_active AS (
              SELECT COUNT(*) AS cnt FROM users
              WHERE deleted_at IS NULL AND last_login_at IS NOT NULL
                AND last_login_at >= CAST(:start AS timestamp) AND last_login_at < CAST(:end AS timestamp)
            )
            SELECT c.churn_date, COUNT(*) AS churn_count,
                   CASE WHEN ta.cnt > 0 THEN COUNT(*)::double precision / ta.cnt ELSE NULL END AS churn_rate
            FROM churned c, total_active ta
            GROUP BY c.churn_date, ta.cnt
            ORDER BY c.churn_date
            """.formatted(dateBucket);

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("start", start.toString());
        query.setParameter("end", end.plusDays(1).toString());

        List<Object[]> rows = query.getResultList();
        List<ChurnTimelineResponse.TimelinePoint> timeline = new ArrayList<>(rows.size());
        long totalChurned = 0;
        double rateSum = 0.0;
        int rateCount = 0;

        for (Object[] row : rows) {
            LocalDate date = toLocalDate(row[0]);
            long count = toLong(row[1]);
            Double rate = toDouble(row[2]);
            timeline.add(new ChurnTimelineResponse.TimelinePoint(date, count, rate));
            totalChurned += count;
            if (rate != null) { rateSum += rate; rateCount++; }
        }

        Double avgRate = rateCount > 0 ? rateSum / rateCount : null;

        return new ChurnTimelineResponse(
            new ChurnTimelineResponse.Period(start, end, TZ),
            gran, timeline, totalChurned, avgRate,
            new ChurnTimelineResponse.Meta(false, DATA_SOURCE_V2));
    }

    // =========================================================================
    // §18 이탈 사유 분석 (3-H.2)
    // =========================================================================

    /**
     * 이탈 사유 추정 — 마지막 활동 패턴 기반.
     * 일기 작성 없음, 매칭 실패, 교환일기 미완료, 채팅 이탈 등.
     */
    @SuppressWarnings("unchecked")
    public ChurnReasonsResponse getChurnReasons() {
        String sql = """
            WITH churned_users AS (
              SELECT u.id
              FROM users u
              WHERE u.deleted_at IS NULL
                AND u.last_login_at IS NOT NULL
                AND u.last_login_at < NOW() - INTERVAL '30 days'
            ),
            user_activity AS (
              SELECT cu.id AS user_id,
                (SELECT COUNT(*) FROM diaries d WHERE d.user_id = cu.id) AS diary_count,
                (SELECT COUNT(*) FROM matchings m WHERE (m.from_user_id = cu.id OR m.to_user_id = cu.id) AND m.status = 'MATCHED') AS match_count,
                (SELECT COUNT(*) FROM exchange_rooms er WHERE (er.user_a_id = cu.id OR er.user_b_id = cu.id)) AS exchange_count,
                (SELECT COUNT(*) FROM chat_rooms cr WHERE (cr.user_a_id = cu.id OR cr.user_b_id = cu.id)) AS chat_count
              FROM churned_users cu
            )
            SELECT
              CASE
                WHEN diary_count = 0 THEN 'NO_DIARY_WRITTEN'
                WHEN match_count = 0 AND diary_count > 0 THEN 'NO_MATCH_FOUND'
                WHEN exchange_count = 0 AND match_count > 0 THEN 'MATCH_BUT_NO_EXCHANGE'
                WHEN chat_count = 0 AND exchange_count > 0 THEN 'EXCHANGE_BUT_NO_CHAT'
                ELSE 'NATURAL_CHURN'
              END AS reason,
              COUNT(*) AS cnt
            FROM user_activity
            GROUP BY 1
            ORDER BY cnt DESC
            """;

        Query query = entityManager.createNativeQuery(sql);
        List<Object[]> rows = query.getResultList();

        long total = rows.stream().mapToLong(r -> toLong(r[1])).sum();
        List<ChurnReasonsResponse.ReasonItem> reasons = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            String reason = (String) row[0];
            long count = toLong(row[1]);
            Double pct = safeDivide(count, total);
            reasons.add(new ChurnReasonsResponse.ReasonItem(reason, count, pct));
        }

        return new ChurnReasonsResponse(reasons, total,
            new ChurnReasonsResponse.Meta(false, DATA_SOURCE_V2));
    }

    // =========================================================================
    // §18 이탈 위험 사용자 수 (3-H.3)
    // =========================================================================

    /**
     * 이탈 위험 사용자 — HIGH=14일+, MEDIUM=7~14일, LOW=3~7일.
     */
    @SuppressWarnings("unchecked")
    public ChurnAtRiskResponse getChurnAtRiskCount() {
        String sql = """
            SELECT
              CASE
                WHEN last_login_at < NOW() - INTERVAL '14 days' THEN 'HIGH'
                WHEN last_login_at < NOW() - INTERVAL '7 days' THEN 'MEDIUM'
                WHEN last_login_at < NOW() - INTERVAL '3 days' THEN 'LOW'
              END AS risk_level,
              COUNT(*) AS cnt
            FROM users
            WHERE deleted_at IS NULL
              AND last_login_at IS NOT NULL
              AND last_login_at < NOW() - INTERVAL '3 days'
            GROUP BY 1
            ORDER BY MIN(last_login_at)
            """;

        Query query = entityManager.createNativeQuery(sql);
        List<Object[]> rows = query.getResultList();

        long total = 0;
        List<ChurnAtRiskResponse.RiskLevelCount> levels = new ArrayList<>(3);
        for (Object[] row : rows) {
            String level = (String) row[0];
            long count = toLong(row[1]);
            levels.add(new ChurnAtRiskResponse.RiskLevelCount(level, count));
            total += count;
        }

        return new ChurnAtRiskResponse(total, levels,
            new ChurnAtRiskResponse.Meta(false, DATA_SOURCE_V2));
    }

    // =========================================================================
    // §18 비활성 사용자 요약 (3-H.4)
    // =========================================================================

    /**
     * 비활성 사용자 요약 — last_login_at 기반 비활성 기간 구간별.
     */
    @SuppressWarnings("unchecked")
    public InactiveUsersSummaryResponse getInactiveUsersSummary() {
        String sql = """
            WITH inactive AS (
              SELECT id,
                EXTRACT(DAY FROM NOW() - last_login_at)::int AS inactive_days
              FROM users
              WHERE deleted_at IS NULL
                AND last_login_at IS NOT NULL
                AND last_login_at < NOW() - INTERVAL '3 days'
            ),
            reactivated AS (
              SELECT COUNT(*) AS cnt FROM users
              WHERE deleted_at IS NULL
                AND last_login_at IS NOT NULL
                AND last_login_at >= NOW() - INTERVAL '7 days'
                AND created_at < NOW() - INTERVAL '30 days'
            )
            SELECT
              (SELECT COUNT(*) FROM inactive) AS total_inactive,
              COALESCE(SUM(CASE WHEN inactive_days BETWEEN 3 AND 6 THEN 1 ELSE 0 END), 0) AS d3_6,
              COALESCE(SUM(CASE WHEN inactive_days BETWEEN 7 AND 14 THEN 1 ELSE 0 END), 0) AS d7_14,
              COALESCE(SUM(CASE WHEN inactive_days BETWEEN 15 AND 30 THEN 1 ELSE 0 END), 0) AS d15_30,
              COALESCE(SUM(CASE WHEN inactive_days BETWEEN 31 AND 60 THEN 1 ELSE 0 END), 0) AS d31_60,
              COALESCE(SUM(CASE WHEN inactive_days > 60 THEN 1 ELSE 0 END), 0) AS d60_plus,
              (SELECT cnt FROM reactivated) AS reactivated_count,
              (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND last_login_at IS NOT NULL AND created_at < NOW() - INTERVAL '30 days') AS base_count
            FROM inactive
            """;

        Query query = entityManager.createNativeQuery(sql);
        Object[] row = (Object[]) query.getSingleResult();

        long totalInactive = toLong(row[0]);
        List<InactiveUsersSummaryResponse.InactiveBucket> buckets = List.of(
            new InactiveUsersSummaryResponse.InactiveBucket("3-6일", toLong(row[1])),
            new InactiveUsersSummaryResponse.InactiveBucket("7-14일", toLong(row[2])),
            new InactiveUsersSummaryResponse.InactiveBucket("15-30일", toLong(row[3])),
            new InactiveUsersSummaryResponse.InactiveBucket("31-60일", toLong(row[4])),
            new InactiveUsersSummaryResponse.InactiveBucket("60일 이상", toLong(row[5]))
        );

        long reactivated = toLong(row[6]);
        long baseCount = toLong(row[7]);
        Double reactivationRate = safeDivide(reactivated, baseCount);

        return new InactiveUsersSummaryResponse(totalInactive, buckets, reactivationRate,
            new InactiveUsersSummaryResponse.Meta(false, DATA_SOURCE_V2));
    }

    // =========================================================================
    // §18 탈퇴 통계 (3-H.5)
    // =========================================================================

    /**
     * 탈퇴 통계 — user_withdrawal_log 기반.
     */
    @SuppressWarnings("unchecked")
    public WithdrawalStatsResponse getWithdrawalStats(LocalDate startDate, LocalDate endDate) {
        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(29);
        LocalDate endExclusive = end.plusDays(1);

        // 전체 탈퇴 수
        String totalSql = """
            SELECT COUNT(*) FROM user_withdrawal_log
            WHERE withdrawn_at >= CAST(:start AS timestamp) AND withdrawn_at < CAST(:end AS timestamp)
            """;
        Query totalQuery = entityManager.createNativeQuery(totalSql);
        totalQuery.setParameter("start", start.toString());
        totalQuery.setParameter("end", endExclusive.toString());
        long totalWithdrawals = toLong(totalQuery.getSingleResult());

        // 삭제 대기 수 (permanent_delete_at 이 아직 미래)
        String pendingSql = """
            SELECT COUNT(*) FROM user_withdrawal_log
            WHERE permanent_delete_at > NOW()
            """;
        long pendingDeletion = toLong(entityManager.createNativeQuery(pendingSql).getSingleResult());

        // 사유별 집계
        String reasonSql = """
            SELECT COALESCE(reason, 'UNKNOWN') AS reason, COUNT(*) AS cnt
            FROM user_withdrawal_log
            WHERE withdrawn_at >= CAST(:start AS timestamp) AND withdrawn_at < CAST(:end AS timestamp)
            GROUP BY reason ORDER BY cnt DESC
            """;
        Query reasonQuery = entityManager.createNativeQuery(reasonSql);
        reasonQuery.setParameter("start", start.toString());
        reasonQuery.setParameter("end", endExclusive.toString());
        List<Object[]> reasonRows = reasonQuery.getResultList();

        List<WithdrawalStatsResponse.ReasonCount> byReason = new ArrayList<>(reasonRows.size());
        for (Object[] r : reasonRows) {
            String reason = (String) r[0];
            long count = toLong(r[1]);
            byReason.add(new WithdrawalStatsResponse.ReasonCount(
                reason, count, safeDivide(count, totalWithdrawals)));
        }

        // 일별 추이
        String trendSql = """
            SELECT (withdrawn_at AT TIME ZONE 'Asia/Seoul')::date AS d, COUNT(*)
            FROM user_withdrawal_log
            WHERE withdrawn_at >= CAST(:start AS timestamp) AND withdrawn_at < CAST(:end AS timestamp)
            GROUP BY d ORDER BY d
            """;
        Query trendQuery = entityManager.createNativeQuery(trendSql);
        trendQuery.setParameter("start", start.toString());
        trendQuery.setParameter("end", endExclusive.toString());
        List<Object[]> trendRows = trendQuery.getResultList();

        List<WithdrawalStatsResponse.DailyTrend> dailyTrend = new ArrayList<>(trendRows.size());
        for (Object[] r : trendRows) {
            dailyTrend.add(new WithdrawalStatsResponse.DailyTrend(toLocalDate(r[0]), toLong(r[1])));
        }

        return new WithdrawalStatsResponse(
            new WithdrawalStatsResponse.Period(start, end, TZ),
            totalWithdrawals, pendingDeletion, byReason, dailyTrend,
            new WithdrawalStatsResponse.Meta(false, DATA_SOURCE_V2));
    }

    // =========================================================================
    // §18 탈퇴 사유 상세 (3-H.6)
    // =========================================================================

    /**
     * 탈퇴 사유 상세 목록 (페이징).
     */
    @SuppressWarnings("unchecked")
    public WithdrawalReasonResponse getWithdrawalReasons(String reason, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        String whereClause = (reason != null && !reason.isBlank())
            ? "WHERE reason = :reason" : "";

        String countSql = "SELECT COUNT(*) FROM user_withdrawal_log " + whereClause;
        Query countQuery = entityManager.createNativeQuery(countSql);
        if (!whereClause.isEmpty()) countQuery.setParameter("reason", reason);
        long totalElements = toLong(countQuery.getSingleResult());

        String dataSql = """
            SELECT id, user_id, COALESCE(reason, 'UNKNOWN'), detail, withdrawn_at, permanent_delete_at
            FROM user_withdrawal_log %s
            ORDER BY withdrawn_at DESC
            LIMIT :limit OFFSET :offset
            """.formatted(whereClause);
        Query dataQuery = entityManager.createNativeQuery(dataSql);
        if (!whereClause.isEmpty()) dataQuery.setParameter("reason", reason);
        dataQuery.setParameter("limit", safeSize);
        dataQuery.setParameter("offset", safePage * safeSize);

        List<Object[]> rows = dataQuery.getResultList();
        List<WithdrawalReasonResponse.WithdrawalItem> items = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            items.add(new WithdrawalReasonResponse.WithdrawalItem(
                toLong(row[0]),
                toLong(row[1]),
                (String) row[2],
                row[3] != null ? row[3].toString() : null,
                toLocalDateTime(row[4]),
                toLocalDateTime(row[5])
            ));
        }

        int totalPages = (int) Math.ceil((double) totalElements / safeSize);
        return new WithdrawalReasonResponse(items, safePage, safeSize, totalElements, totalPages,
            new WithdrawalReasonResponse.Meta(false, DATA_SOURCE_V2));
    }

    // =========================================================================
    // §18 사용자 퍼널 분석 - 이탈 분석용 (3-H.7)
    // =========================================================================

    /**
     * 사용자 퍼널 분석 (이탈 분석용 6단 퍼널).
     * signup -> profile -> first_diary -> first_match -> exchange -> couple.
     */
    @SuppressWarnings("unchecked")
    public ChurnFunnelResponse getUserChurnFunnel(String period, String cohort) {
        int days = parsePeriodDays(period, 30);
        String cohortMode = (cohort == null || cohort.isBlank()) ? "signup_date" : cohort;
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(days);
        LocalDate endExclusive = end.plusDays(1);

        String sql = """
            SELECT
              (SELECT COUNT(*) FROM users
               WHERE deleted_at IS NULL AND created_at >= CAST(:start AS timestamp) AND created_at < CAST(:end AS timestamp)) AS signups,
              (SELECT COUNT(DISTINCT u.id) FROM users u
               WHERE u.deleted_at IS NULL AND u.onboarding_step >= 1
                 AND u.created_at >= CAST(:start AS timestamp) AND u.created_at < CAST(:end AS timestamp)) AS profiles,
              (SELECT COUNT(DISTINCT d.user_id) FROM diaries d
               JOIN users u ON u.id = d.user_id
               WHERE u.deleted_at IS NULL AND u.created_at >= CAST(:start AS timestamp) AND u.created_at < CAST(:end AS timestamp)) AS first_diary,
              (SELECT COUNT(DISTINCT CASE WHEN m.from_user_id = u.id THEN u.id ELSE u.id END)
               FROM matchings m JOIN users u ON u.id = m.from_user_id OR u.id = m.to_user_id
               WHERE m.status = 'MATCHED' AND u.deleted_at IS NULL
                 AND u.created_at >= CAST(:start AS timestamp) AND u.created_at < CAST(:end AS timestamp)) AS first_match,
              (SELECT COUNT(DISTINCT CASE WHEN er.user_a_id = u.id THEN u.id ELSE u.id END)
               FROM exchange_rooms er JOIN users u ON u.id = er.user_a_id OR u.id = er.user_b_id
               WHERE u.deleted_at IS NULL AND u.created_at >= CAST(:start AS timestamp) AND u.created_at < CAST(:end AS timestamp)) AS exchange,
              (SELECT COUNT(DISTINCT CASE WHEN c.user_a_id = u.id THEN u.id ELSE u.id END)
               FROM couples c JOIN users u ON u.id = c.user_a_id OR u.id = c.user_b_id
               WHERE u.deleted_at IS NULL AND u.created_at >= CAST(:start AS timestamp) AND u.created_at < CAST(:end AS timestamp)) AS couple
            """;

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("start", start.toString());
        query.setParameter("end", endExclusive.toString());

        Object[] row = (Object[]) query.getSingleResult();
        long signups = toLong(row[0]);
        long profiles = toLong(row[1]);
        long firstDiary = toLong(row[2]);
        long firstMatch = toLong(row[3]);
        long exchange = toLong(row[4]);
        long couple = toLong(row[5]);

        List<ChurnFunnelResponse.FunnelStage> stages = List.of(
            new ChurnFunnelResponse.FunnelStage("SIGNUP", signups, 1.0, null),
            new ChurnFunnelResponse.FunnelStage("PROFILE", profiles,
                safeDivide(profiles, signups), dropoffRate(signups, profiles)),
            new ChurnFunnelResponse.FunnelStage("FIRST_DIARY", firstDiary,
                safeDivide(firstDiary, signups), dropoffRate(profiles, firstDiary)),
            new ChurnFunnelResponse.FunnelStage("FIRST_MATCH", firstMatch,
                safeDivide(firstMatch, signups), dropoffRate(firstDiary, firstMatch)),
            new ChurnFunnelResponse.FunnelStage("EXCHANGE", exchange,
                safeDivide(exchange, signups), dropoffRate(firstMatch, exchange)),
            new ChurnFunnelResponse.FunnelStage("COUPLE", couple,
                safeDivide(couple, signups), dropoffRate(exchange, couple))
        );

        return new ChurnFunnelResponse(
            new ChurnFunnelResponse.Period(start, end, TZ),
            cohortMode, stages, signups, safeDivide(couple, signups),
            new ChurnFunnelResponse.Meta(false, DATA_SOURCE_V2));
    }

    // =========================================================================
    // period 파싱 유틸
    // =========================================================================

    private static int parsePeriodDays(String period, int defaultDays) {
        if (period == null || period.isBlank()) return defaultDays;
        return switch (period.toLowerCase(Locale.ROOT)) {
            case "7d" -> 7;
            case "30d" -> 30;
            case "90d" -> 90;
            case "180d" -> 180;
            default -> defaultDays;
        };
    }

    private static LocalDateTime toLocalDateTime(Object o) {
        if (o == null) return null;
        if (o instanceof LocalDateTime ldt) return ldt;
        if (o instanceof java.sql.Timestamp ts) return ts.toLocalDateTime();
        return LocalDateTime.parse(o.toString());
    }

    // =========================================================================
    // 내부 유틸
    // =========================================================================

    private String computeWorstDropoffStage(StageTotals t) {
        Map<String, Double> rates = Map.of(
                "ACCEPT",   nullToOne(t.acceptRate()),
                "EXCHANGE", nullToOne(t.exchangeRate()),
                "COUPLE",   nullToOne(t.coupleRate())
        );
        return rates.entrySet().stream()
                .min(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    private static Double dropoffRate(long from, long to) {
        if (from <= 0) return null;
        double retained = (double) to / (double) from;
        return 1.0 - retained;
    }

    private static void accumulateRate(Map<String, Double> acc, String key, Double value) {
        if (value == null) return;
        acc.merge(key, value, Double::sum);
    }

    private static String maturityLabel(long days) {
        if (days < 28)  return "WARMING_UP";
        if (days < 84)  return "PARTIAL";
        return "MATURE";
    }

    private static Double safeDivide(long numerator, long denominator) {
        if (denominator <= 0) return null;
        return (double) numerator / (double) denominator;
    }

    private static double nullToOne(Double v) {
        return v == null ? 1.0 : v;
    }

    private static long toLong(Object o) {
        if (o == null) return 0L;
        if (o instanceof Number n) return n.longValue();
        if (o instanceof BigDecimal b) return b.longValue();
        return Long.parseLong(o.toString());
    }

    private static Double toDouble(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.doubleValue();
        if (o instanceof BigDecimal b) return b.doubleValue();
        try { return Double.parseDouble(o.toString()); } catch (NumberFormatException e) { return null; }
    }

    private static BigDecimal toBigDecimal(Object o) {
        if (o == null) return null;
        if (o instanceof BigDecimal b) return b;
        if (o instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        try { return new BigDecimal(o.toString()); } catch (NumberFormatException e) { return null; }
    }

    private static LocalDate toLocalDate(Object o) {
        if (o == null) return null;
        if (o instanceof LocalDate ld) return ld;
        if (o instanceof Date d) return d.toLocalDate();
        return LocalDate.parse(o.toString());
    }
}
