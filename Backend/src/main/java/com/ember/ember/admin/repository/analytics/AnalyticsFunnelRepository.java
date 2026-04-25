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
 * 매칭 퍼널 집계 Repository — 설계서 §3.1 매핑.
 *
 * 설계서 상에선 matching_recommendations + matching_responses 2테이블을 가정했지만,
 * 현재 스키마는 matchings 단일 테이블 + status enum 으로 관리된다.
 * 매핑 규약:
 *   - recs   : matchings.created_at 기준 당일 생성 row 수
 *   - accepts: matchings.matched_at 기준 당일 MATCHED 로 전환된 row 수
 *   - exchanges: exchange_rooms.created_at 기준 당일 생성 room 수 (양방향 1:1)
 *   - couples : couples.confirmed_at 기준 당일 생성 row 수
 *
 * Point-in-time 일관성(설계서 §0.3): 각 지표는 이벤트 시점 기준만 사용한다.
 * Soft delete(설계서 §0.4): users 는 @SQLRestriction deleted_at IS NULL 이 걸려 있어
 * JPQL은 자동 필터링되지만, 네이티브 SQL에선 명시적으로 조건을 추가해야 한다.
 */
@Repository
@RequiredArgsConstructor
public class AnalyticsFunnelRepository {

    @PersistenceContext
    private final EntityManager em;

    /**
     * 일별 매칭 퍼널 집계.
     *
     * 쿼리 전략 (설계서 §4 최적화 반영):
     *   1) date_series 로 기간 내 모든 날짜를 생성(0 row 보정).
     *   2) 각 단계별 일별 COUNT 를 CTE 로 분리.
     *   3) LEFT JOIN 으로 피벗 → 누락된 날짜는 0 으로 채움.
     *   4) gender 필터는 matchings.from_user_id 기준 users.gender 로 조인.
     *   5) 인덱스 ix_matchings_created_from_status / ix_matchings_matched_status 활용.
     *
     * KST 처리: created_at/matched_at 은 TIMESTAMPTZ → AT TIME ZONE 'Asia/Seoul' → DATE 캐스팅.
     *
     * @param startDate 포함(Asia/Seoul 기준 날짜)
     * @param endDateExclusive 미포함(설계서 §0.5 half-open [start, end))
     * @param gender 'M'/'F'/null(=ALL)
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> aggregateDailyFunnel(LocalDate startDate,
                                               LocalDate endDateExclusive,
                                               String gender) {
        LocalDateTime startTs = startDate.atStartOfDay();
        LocalDateTime endTs = endDateExclusive.atStartOfDay();

        String sql = """
                WITH date_series AS (
                    SELECT generate_series(
                               CAST(:startDate AS date),
                               (CAST(:endDate AS date) - INTERVAL '1 day')::date,
                               INTERVAL '1 day'
                           )::date AS d
                ),
                filtered_matchings AS (
                    SELECT m.id, m.from_user_id, m.status, m.matched_at, m.created_at
                      FROM matchings m
                      JOIN users u ON u.id = m.from_user_id AND u.deleted_at IS NULL
                     WHERE m.created_at >= :startTs AND m.created_at < :endTs
                       AND (CAST(:gender AS VARCHAR) IS NULL OR u.gender = CAST(:gender AS VARCHAR))
                ),
                daily_recs AS (
                    SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS d,
                           COUNT(*) AS cnt
                      FROM filtered_matchings
                     GROUP BY 1
                ),
                daily_accepts AS (
                    SELECT (matched_at AT TIME ZONE 'Asia/Seoul')::date AS d,
                           COUNT(*) AS cnt
                      FROM filtered_matchings
                     WHERE status = 'MATCHED' AND matched_at IS NOT NULL
                     GROUP BY 1
                ),
                daily_exchanges AS (
                    SELECT (er.created_at AT TIME ZONE 'Asia/Seoul')::date AS d,
                           COUNT(*) AS cnt
                      FROM exchange_rooms er
                      JOIN users ua ON ua.id = er.user_a_id AND ua.deleted_at IS NULL
                     WHERE er.created_at >= :startTs AND er.created_at < :endTs
                       AND (CAST(:gender AS VARCHAR) IS NULL OR ua.gender = CAST(:gender AS VARCHAR))
                     GROUP BY 1
                ),
                daily_couples AS (
                    SELECT (c.confirmed_at AT TIME ZONE 'Asia/Seoul')::date AS d,
                           COUNT(*) AS cnt
                      FROM couples c
                      JOIN users ua ON ua.id = c.user_a_id AND ua.deleted_at IS NULL
                     WHERE c.confirmed_at >= :startTs AND c.confirmed_at < :endTs
                       AND (CAST(:gender AS VARCHAR) IS NULL OR ua.gender = CAST(:gender AS VARCHAR))
                     GROUP BY 1
                )
                SELECT ds.d,
                       COALESCE(r.cnt, 0)  AS recs,
                       COALESCE(a.cnt, 0)  AS accepts,
                       COALESCE(e.cnt, 0)  AS exchanges,
                       COALESCE(cp.cnt, 0) AS couples
                  FROM date_series ds
                  LEFT JOIN daily_recs      r  ON r.d  = ds.d
                  LEFT JOIN daily_accepts   a  ON a.d  = ds.d
                  LEFT JOIN daily_exchanges e  ON e.d  = ds.d
                  LEFT JOIN daily_couples   cp ON cp.d = ds.d
                 ORDER BY ds.d
                """;

        var query = em.createNativeQuery(sql);
        query.setParameter("startDate", startDate);
        query.setParameter("endDate", endDateExclusive);
        query.setParameter("startTs", startTs);
        query.setParameter("endTs", endTs);
        query.setParameter("gender", gender);

        List<Object[]> rows = (List<Object[]>) query.getResultList();
        return rows != null ? rows : new ArrayList<>();
    }
}
