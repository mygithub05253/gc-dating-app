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
 * 여정 소요시간 Repository — 설계서 §3.5 (Fallback 모드).
 *
 * user_activity_events 스트림에 SIGNUP/PROFILE_COMPLETED/FIRST_MATCH/FIRST_EXCHANGE/FIRST_COUPLE
 * 이벤트가 아직 완전히 기록되지 않으므로 설계서 §3.5.3 Fallback 쿼리를 사용한다.
 *
 * 각 단계 "첫 도달 시각" 유도:
 *   - t_signup   : users.created_at
 *   - t_profile  : users.onboarding_step >= 1 인 사용자에 대해 BaseEntity.updatedAt(프로필 완료 시각 추정)
 *                  엔티티에 별도 컬럼이 없어 근사치로 updated_at 사용 (설계서 §3.5.4 J5 — fallback warn)
 *   - t_match    : 해당 사용자가 from/to 로 등장한 matchings 중 status='MATCHED' 의 MIN(matched_at)
 *   - t_exchange : 해당 사용자가 user_a/user_b 로 등장한 exchange_rooms 의 MIN(created_at)
 *   - t_couple   : 해당 사용자가 user_a/user_b 로 등장한 couples 의 MIN(confirmed_at)
 *
 * 시점 역전(J4) 은 h_* < 0 을 필터로 제외.
 */
@Repository
@RequiredArgsConstructor
public class AnalyticsJourneyRepository {

    @PersistenceContext
    private final EntityManager em;

    /**
     * 각 단계별 소요시간(시간 단위) 통계. 한 쿼리로 4개 단계 UNION 집계.
     *
     * @return [stage, n, p50_h, p90_h, p99_h, mean_h, stddev_h]
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> aggregateStageDurations(LocalDate periodStart,
                                                  LocalDate periodEnd) {
        LocalDateTime startTs = periodStart.atStartOfDay();
        LocalDateTime endTs = periodEnd.atStartOfDay();

        String sql = """
                WITH base AS (
                    SELECT
                        u.id AS user_id,
                        u.created_at AS t_signup,
                        CASE WHEN u.onboarding_step >= 1 THEN u.updated_at END AS t_profile,
                        (SELECT MIN(m.matched_at)
                           FROM matchings m
                          WHERE m.status = 'MATCHED'
                            AND m.matched_at IS NOT NULL
                            AND (m.from_user_id = u.id OR m.to_user_id = u.id)) AS t_match,
                        (SELECT MIN(e.created_at)
                           FROM exchange_rooms e
                          WHERE e.user_a_id = u.id OR e.user_b_id = u.id)       AS t_exchange,
                        (SELECT MIN(c.confirmed_at)
                           FROM couples c
                          WHERE c.user_a_id = u.id OR c.user_b_id = u.id)        AS t_couple
                      FROM users u
                     WHERE u.deleted_at IS NULL
                       AND u.created_at >= CAST(:startTs AS TIMESTAMP)
                       AND u.created_at <  CAST(:endTs AS TIMESTAMP)
                ),
                durations AS (
                    SELECT
                        user_id,
                        EXTRACT(EPOCH FROM (t_profile  - t_signup))   / 3600.0 AS h_signup_to_profile,
                        EXTRACT(EPOCH FROM (t_match    - t_profile))  / 3600.0 AS h_profile_to_match,
                        EXTRACT(EPOCH FROM (t_exchange - t_match))    / 3600.0 AS h_match_to_exchange,
                        EXTRACT(EPOCH FROM (t_couple   - t_exchange)) / 3600.0 AS h_exchange_to_couple
                      FROM base
                )
                SELECT 'SIGNUP_TO_PROFILE' AS stage,
                       COUNT(*) FILTER (WHERE h_signup_to_profile IS NOT NULL AND h_signup_to_profile >= 0) AS n,
                       PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY h_signup_to_profile) FILTER (WHERE h_signup_to_profile >= 0) AS p50_h,
                       PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY h_signup_to_profile) FILTER (WHERE h_signup_to_profile >= 0) AS p90_h,
                       PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY h_signup_to_profile) FILTER (WHERE h_signup_to_profile >= 0) AS p99_h,
                       AVG(h_signup_to_profile)    FILTER (WHERE h_signup_to_profile >= 0) AS mean_h,
                       STDDEV(h_signup_to_profile) FILTER (WHERE h_signup_to_profile >= 0) AS stddev_h
                  FROM durations
                UNION ALL
                SELECT 'PROFILE_TO_MATCH',
                       COUNT(*) FILTER (WHERE h_profile_to_match IS NOT NULL AND h_profile_to_match >= 0),
                       PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY h_profile_to_match) FILTER (WHERE h_profile_to_match >= 0),
                       PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY h_profile_to_match) FILTER (WHERE h_profile_to_match >= 0),
                       PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY h_profile_to_match) FILTER (WHERE h_profile_to_match >= 0),
                       AVG(h_profile_to_match)    FILTER (WHERE h_profile_to_match >= 0),
                       STDDEV(h_profile_to_match) FILTER (WHERE h_profile_to_match >= 0)
                  FROM durations
                UNION ALL
                SELECT 'MATCH_TO_EXCHANGE',
                       COUNT(*) FILTER (WHERE h_match_to_exchange IS NOT NULL AND h_match_to_exchange >= 0),
                       PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY h_match_to_exchange) FILTER (WHERE h_match_to_exchange >= 0),
                       PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY h_match_to_exchange) FILTER (WHERE h_match_to_exchange >= 0),
                       PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY h_match_to_exchange) FILTER (WHERE h_match_to_exchange >= 0),
                       AVG(h_match_to_exchange)    FILTER (WHERE h_match_to_exchange >= 0),
                       STDDEV(h_match_to_exchange) FILTER (WHERE h_match_to_exchange >= 0)
                  FROM durations
                UNION ALL
                SELECT 'EXCHANGE_TO_COUPLE',
                       COUNT(*) FILTER (WHERE h_exchange_to_couple IS NOT NULL AND h_exchange_to_couple >= 0),
                       PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY h_exchange_to_couple) FILTER (WHERE h_exchange_to_couple >= 0),
                       PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY h_exchange_to_couple) FILTER (WHERE h_exchange_to_couple >= 0),
                       PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY h_exchange_to_couple) FILTER (WHERE h_exchange_to_couple >= 0),
                       AVG(h_exchange_to_couple)    FILTER (WHERE h_exchange_to_couple >= 0),
                       STDDEV(h_exchange_to_couple) FILTER (WHERE h_exchange_to_couple >= 0)
                  FROM durations
                """;

        var query = em.createNativeQuery(sql);
        query.setParameter("startTs", startTs);
        query.setParameter("endTs", endTs);

        List<Object[]> rows = (List<Object[]>) query.getResultList();
        return rows != null ? rows : new ArrayList<>();
    }
}
