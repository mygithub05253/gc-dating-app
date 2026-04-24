package com.ember.ember.admin.dto.analytics;

import java.time.LocalDate;
import java.util.List;

/**
 * 코호트 리텐션 매트릭스 — 설계서 §3.17 (B-5).
 *
 * 아이디어:
 *   사용자를 가입 "주" 코호트로 묶어, 가입 후 경과한 주(Week 0, 1, 2, ..., N-1) 별로
 *   해당 주에 활동(일기 작성 OR 교환일기 제출)한 사용자 비율을 매트릭스로 시각화한다.
 *
 * 정의:
 *   - cohort_week          : DATE_TRUNC('week', users.created_at AT TIME ZONE 'Asia/Seoul') — 가입 주 월요일
 *   - cohort_size          : 해당 주에 가입한 distinct 유저 수
 *   - week_offset          : 가입 주 월요일 00:00 KST 기준 FLOOR((activity_at - cohort_week) / 7days)
 *   - retained(cohort, t)  : 해당 cohort 중 week_offset = t 구간에 활동한 distinct user 수
 *   - rate                 : retained / cohort_size
 *   - observable           : (cohort_week + (t+1)*7) <= today 일 때만 true
 *                            (아직 완전히 경과하지 않은 주는 불공정 비교를 피하기 위해 null 처리)
 *
 * 액티비티 정의:
 *   - diaries.created_at            (일기 작성)
 *   - exchange_diaries.submitted_at (교환일기 제출)
 *   login 자체는 users.last_login_at 1개 컬럼이라 주단위 retention 계산 불가 → 활동 정의에서 제외.
 *
 * 포트폴리오 가치:
 *   - 가입 후 첫 주의 Aha Moment 도달률, 4~8주 지난 재활성 비율 등 product-level 인사이트.
 *   - Amplitude/Mixpanel Retention Curve 와 동일 모양 (SQL-native 1-shot CTE).
 */
public record CohortRetentionResponse(
        Period period,
        int maxWeeks,
        int cohortCount,
        long totalCohortUsers,
        List<CohortRow> cohorts,
        List<AverageByWeek> averageByWeek,
        Meta meta
) {
    public record Period(LocalDate startDate, LocalDate endDate, String timezone) {}

    /**
     * @param cohortWeekStart 가입 주 월요일 (KST)
     * @param cohortWeekEnd   해당 주 일요일 (KST, inclusive)
     * @param cohortSize      해당 주 가입 distinct 유저
     * @param cells           week_offset 0..maxWeeks-1
     */
    public record CohortRow(
            LocalDate cohortWeekStart,
            LocalDate cohortWeekEnd,
            long cohortSize,
            List<RetentionCell> cells
    ) {}

    /**
     * @param weekOffset 가입 후 경과 주 (0-based)
     * @param retained   해당 구간 활동 distinct user 수 (observable=false 면 null)
     * @param rate       retained / cohortSize (observable=false 면 null)
     * @param observable 주 구간이 today 까지 완전히 경과했는지 여부
     */
    public record RetentionCell(
            int weekOffset,
            Long retained,
            Double rate,
            boolean observable
    ) {}

    /**
     * 코호트별 rate 를 평균내어 "전체 리텐션 곡선" 제공.
     * 관측 가능한 코호트만 평균에 포함 (observableCohorts).
     */
    public record AverageByWeek(
            int weekOffset,
            Double averageRate,
            int observableCohorts
    ) {}

    public record Meta(
            String algorithm,          // "cohort-retention-weekly"
            boolean degraded,
            String dataSourceVersion
    ) {}
}
