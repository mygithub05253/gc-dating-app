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
 * 사용자 세그먼테이션 Repository — 설계서 §3.15 (B-3).
 *
 * RFE (Recency, Frequency, Engagement) 벡터를 단일 쿼리로 추출.
 *
 * 정의:
 *   - Recency:   기간 종료일 - MAX(last_login_at, 최근 일기 일자, 최근 교환일기 제출일)
 *   - Frequency: 기간 내 본인 일기 작성 건수 (analysis_status 무관, deleted 제외)
 *   - Engagement: 교환일기 제출 수 × 2 + AI 분석 완료 일기 수 × 1
 *                 (교환일기는 상호작용 강도가 높으므로 가중치 부여)
 *
 * 포트폴리오 설계 근거:
 *   - RFE는 e-commerce RFM을 소개팅앱 맥락(콘텐츠 소비 x 작성 참여)으로 재해석.
 *   - Engagement 가중치 2:1은 교환일기 1건이 개인 일기 2건의 상호작용 가치를 가진다는 도메인 가정.
 *     사용자 피드백 수집 후 조정 가능 (현재 v0.1 휴리스틱).
 */
@Repository
@RequiredArgsConstructor
public class AnalyticsSegmentationRepository {

    @PersistenceContext
    private final EntityManager em;

    /**
     * 기간 내 활성 사용자의 RFE 벡터 추출.
     *
     * Recency가 기간 종료일 이전 활동이 없는 사용자는 기간 길이(=기본값 max recency) 로 치환.
     *
     * @return [user_id, recency_days, frequency, engagement]
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> aggregateRfeVectors(LocalDate periodStart, LocalDate periodEnd) {
        LocalDateTime startTs = periodStart.atStartOfDay();
        LocalDateTime endTs = periodEnd.atStartOfDay();

        String sql = """
                WITH diary_activity AS (
                    SELECT d.user_id,
                           MAX(d.created_at)                                AS last_diary_at,
                           COUNT(*)                                          AS diary_cnt,
                           SUM(CASE WHEN d.analysis_status = 'COMPLETED'
                                    THEN 1 ELSE 0 END)                       AS completed_cnt
                      FROM diaries d
                     WHERE d.created_at >= CAST(:startTs AS TIMESTAMP)
                       AND d.created_at <  CAST(:endTs AS TIMESTAMP)
                       AND d.deleted_at IS NULL
                     GROUP BY d.user_id
                ),
                exchange_activity AS (
                    SELECT ed.author_id AS user_id,
                           MAX(ed.submitted_at)                              AS last_exchange_at,
                           COUNT(*)                                          AS exchange_cnt
                      FROM exchange_diaries ed
                     WHERE ed.submitted_at IS NOT NULL
                       AND ed.submitted_at >= CAST(:startTs AS TIMESTAMP)
                       AND ed.submitted_at <  CAST(:endTs AS TIMESTAMP)
                     GROUP BY ed.author_id
                )
                SELECT
                    u.id                                                    AS user_id,
                    -- Recency: 기간 종료일 - 가장 최근 활동. 활동 없으면 (endTs - startTs) 일수로 치환.
                    COALESCE(
                        EXTRACT(EPOCH FROM (CAST(:endTs AS TIMESTAMP) - GREATEST(
                            u.last_login_at,
                            da.last_diary_at,
                            ea.last_exchange_at
                        ))) / 86400.0,
                        EXTRACT(EPOCH FROM (CAST(:endTs AS TIMESTAMP) - CAST(:startTs AS TIMESTAMP))) / 86400.0
                    )::float                                                AS recency_days,
                    COALESCE(da.diary_cnt, 0)                               AS frequency,
                    -- Engagement: 교환일기 × 2 + AI 완료 일기 × 1
                    (COALESCE(ea.exchange_cnt, 0) * 2
                     + COALESCE(da.completed_cnt, 0))                        AS engagement
                  FROM users u
                  LEFT JOIN diary_activity    da ON da.user_id = u.id
                  LEFT JOIN exchange_activity ea ON ea.user_id = u.id
                 WHERE u.deleted_at IS NULL
                   AND u.status = 'ACTIVE'
                   AND u.created_at < CAST(:endTs AS TIMESTAMP)
                """;

        var query = em.createNativeQuery(sql);
        query.setParameter("startTs", startTs);
        query.setParameter("endTs", endTs);

        List<Object[]> rows = (List<Object[]>) query.getResultList();
        return rows != null ? rows : new ArrayList<>();
    }
}
