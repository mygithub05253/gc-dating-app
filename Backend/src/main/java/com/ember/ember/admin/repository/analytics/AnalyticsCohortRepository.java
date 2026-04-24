package com.ember.ember.admin.repository.analytics;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 코호트 리텐션 매트릭스 Repository — 설계서 §3.17 (B-5).
 *
 * 주 단위 가입 코호트를 signup_week 로 묶고, 가입 주 월요일 00:00 KST 기준
 * 경과 주차(week_offset = floor((activity_at - cohort_week) / 7days)) 별
 * distinct 활동 사용자 수를 집계한다.
 *
 * 활동 정의(Activity):
 *   - diaries.created_at            (일기 작성)
 *   - exchange_diaries.submitted_at (교환일기 제출)
 */
@Repository
@RequiredArgsConstructor
public class AnalyticsCohortRepository {

    @PersistenceContext
    private final EntityManager em;

    /**
     * 주 단위 signup 코호트 크기.
     *
     * @return [cohort_week(Date, KST 월요일), cohort_size(Long)]
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> aggregateCohortSizes(LocalDate periodStart, LocalDate periodEnd) {
        LocalDateTime startTs = periodStart.atStartOfDay();
        LocalDateTime endTs = periodEnd.atStartOfDay();

        String sql = """
                SELECT (DATE_TRUNC('week', u.created_at AT TIME ZONE 'Asia/Seoul'))::date AS cohort_week,
                       COUNT(*)                                                            AS cohort_size
                  FROM users u
                 WHERE u.created_at >= :startTs
                   AND u.created_at <  :endTs
                   AND u.deleted_at IS NULL
                 GROUP BY cohort_week
                 ORDER BY cohort_week ASC
                """;

        var query = em.createNativeQuery(sql);
        query.setParameter("startTs", startTs);
        query.setParameter("endTs", endTs);

        List<Object[]> rows = (List<Object[]>) query.getResultList();
        return rows != null ? rows : new ArrayList<>();
    }

    /**
     * 코호트 × week_offset 별 retained distinct user 수.
     *
     * week_offset 0..maxWeeks-1 구간만 반환 (이외는 노이즈).
     * 사용자가 같은 주에 일기와 교환일기 둘 다 써도 DISTINCT user_id 로 1회.
     *
     * @return [cohort_week(Date), week_offset(Int), retained(Long)]
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> aggregateRetentionCounts(LocalDate periodStart,
                                                   LocalDate periodEnd,
                                                   int maxWeeks) {
        LocalDateTime startTs = periodStart.atStartOfDay();
        LocalDateTime endTs = periodEnd.atStartOfDay();
        // 최대 관측 범위: cohort_week + maxWeeks * 7일 (가장 오래된 cohort 의 마지막 주 커버)
        LocalDateTime maxActivityTs = endTs.plusWeeks(maxWeeks).plusDays(1);

        String sql = """
                WITH cohort AS (
                    SELECT u.id AS user_id,
                           (DATE_TRUNC('week', u.created_at AT TIME ZONE 'Asia/Seoul'))::date AS cohort_week
                      FROM users u
                     WHERE u.created_at >= :startTs
                       AND u.created_at <  :endTs
                       AND u.deleted_at IS NULL
                ),
                activity AS (
                    SELECT d.user_id, d.created_at AS activity_at
                      FROM diaries d
                     WHERE d.deleted_at IS NULL
                       AND d.created_at >= :startTs
                       AND d.created_at <  :maxActivityTs
                    UNION ALL
                    SELECT ed.author_id AS user_id, ed.submitted_at AS activity_at
                      FROM exchange_diaries ed
                     WHERE ed.submitted_at IS NOT NULL
                       AND ed.submitted_at >= :startTs
                       AND ed.submitted_at <  :maxActivityTs
                ),
                joined AS (
                    SELECT c.cohort_week,
                           c.user_id,
                           FLOOR(
                               EXTRACT(EPOCH FROM
                                   (a.activity_at - (c.cohort_week::timestamp AT TIME ZONE 'Asia/Seoul'))
                               ) / 604800.0
                           )::int AS week_offset
                      FROM cohort c
                      JOIN activity a ON a.user_id = c.user_id
                     WHERE a.activity_at >= (c.cohort_week::timestamp AT TIME ZONE 'Asia/Seoul')
                )
                SELECT cohort_week,
                       week_offset,
                       COUNT(DISTINCT user_id) AS retained
                  FROM joined
                 WHERE week_offset >= 0
                   AND week_offset <  :maxWeeks
                 GROUP BY cohort_week, week_offset
                 ORDER BY cohort_week ASC, week_offset ASC
                """;

        var query = em.createNativeQuery(sql);
        query.setParameter("startTs", startTs);
        query.setParameter("endTs", endTs);
        query.setParameter("maxActivityTs", maxActivityTs);
        query.setParameter("maxWeeks", maxWeeks);

        List<Object[]> rows = (List<Object[]>) query.getResultList();
        return rows != null ? rows : new ArrayList<>();
    }
}
