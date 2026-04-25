package com.ember.ember.admin.repository.analytics;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

/**
 * 매칭 다양성·재추천 Repository — 설계서 §3.7.
 *
 * 재추천 self-join 은 (from_user_id, to_user_id, created_at) 복합 인덱스가 필요 — 설계서 §3.7.5/§4.3.
 * V12 마이그레이션에서 ix_matchings_from_to_created 추가.
 */
@Repository
@RequiredArgsConstructor
public class AnalyticsMatchingDiversityRepository {

    @PersistenceContext
    private final EntityManager em;

    /**
     * 추천 다양성 + 재추천 통계 1회 쿼리 집계.
     *
     * @return [total_recs, unique_candidates, shannon_h, rerec_cnt]
     */
    public Object[] aggregateDiversity(LocalDateTime startTs, LocalDateTime endTs, int rerecWindowDays) {
        String sql = """
                WITH period_recs AS (
                    SELECT m.from_user_id, m.to_user_id, m.created_at
                      FROM matchings m
                     WHERE m.created_at >= CAST(:startTs AS TIMESTAMP) AND m.created_at < CAST(:endTs AS TIMESTAMP)
                ),
                candidate_dist AS (
                    SELECT to_user_id, COUNT(*) AS cnt
                      FROM period_recs
                     GROUP BY to_user_id
                ),
                totals AS (
                    SELECT COALESCE(SUM(cnt), 0) AS total,
                           COUNT(*)              AS unique_candidates
                      FROM candidate_dist
                ),
                entropy_calc AS (
                    SELECT CASE WHEN t.total = 0 OR t.unique_candidates <= 1 THEN 0
                                ELSE -SUM((cd.cnt::float / t.total) *
                                          (LN(cd.cnt::float / t.total) / LN(2)))
                           END AS shannon_h
                      FROM candidate_dist cd, totals t
                     GROUP BY t.total, t.unique_candidates
                ),
                rerec AS (
                    SELECT COUNT(*) AS rerec_cnt
                      FROM period_recs r
                     WHERE EXISTS (
                        SELECT 1 FROM matchings r2
                         WHERE r2.from_user_id = r.from_user_id
                           AND r2.to_user_id   = r.to_user_id
                           AND r2.created_at   < r.created_at
                           AND r2.created_at  >= r.created_at - (CAST(:rerecDays AS VARCHAR) || ' days')::interval
                     )
                )
                SELECT t.total                                      AS total_recs,
                       t.unique_candidates                          AS unique_candidates,
                       COALESCE(e.shannon_h, 0)                     AS shannon_h,
                       COALESCE(re.rerec_cnt, 0)                    AS rerec_cnt
                  FROM totals t, entropy_calc e, rerec re
                """;

        var query = em.createNativeQuery(sql);
        query.setParameter("startTs", startTs);
        query.setParameter("endTs", endTs);
        query.setParameter("rerecDays", String.valueOf(rerecWindowDays));

        Object result = query.getSingleResult();
        if (result instanceof Object[] arr) {
            return arr;
        }
        return new Object[]{0L, 0L, 0.0, 0L};
    }
}
