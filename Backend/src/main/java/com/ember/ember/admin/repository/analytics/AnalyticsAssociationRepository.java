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
 * 연관 규칙 마이닝 Repository — 설계서 §3.16 (B-4).
 *
 * 일기를 transaction 으로 간주하고, 해당 일기에 부착된 태그를 item 집합으로 추출.
 * tag_type 은 필터 가능 (예: EMOTION, LIFESTYLE, TONE, RELATIONSHIP_STYLE).
 *
 * 반환 형태:
 *   - [diary_id, tag_type||':'||label] (한 태그 = 한 행) — Java 측에서 diary_id 로 그룹핑
 *   - PostgreSQL array_agg 대신 raw row 반환 (드라이버 비호환 방지)
 */
@Repository
@RequiredArgsConstructor
public class AnalyticsAssociationRepository {

    @PersistenceContext
    private final EntityManager em;

    /**
     * 기간 내 모든 일기의 태그 펼친 결과.
     *
     * @param tagTypes null/empty 면 모든 tag_type, 아니면 필터링
     * @return [diary_id(Long), item(String)]  한 일기에 N개 태그면 N개 행
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> fetchDiaryTagRows(LocalDate periodStart,
                                            LocalDate periodEnd,
                                            List<String> tagTypes) {
        LocalDateTime startTs = periodStart.atStartOfDay();
        LocalDateTime endTs = periodEnd.atStartOfDay();

        boolean useFilter = tagTypes != null && !tagTypes.isEmpty();
        String filterClause = useFilter ? "AND k.tag_type IN :tagTypes" : "";

        String sql = """
                SELECT d.id                                   AS diary_id,
                       k.tag_type || ':' || k.label           AS item
                  FROM diaries d
                  JOIN diary_keywords k ON k.diary_id = d.id
                 WHERE d.created_at >= :startTs
                   AND d.created_at <  :endTs
                   AND d.deleted_at IS NULL
                   AND d.analysis_status = 'COMPLETED'
                   %s
                """.formatted(filterClause);

        var query = em.createNativeQuery(sql);
        query.setParameter("startTs", startTs);
        query.setParameter("endTs", endTs);
        if (useFilter) {
            query.setParameter("tagTypes", tagTypes);
        }

        List<Object[]> rows = (List<Object[]>) query.getResultList();
        return rows != null ? rows : new ArrayList<>();
    }

    /**
     * 기간 내 distinct 일기(transaction) 수. support 계산의 분모.
     */
    public long countTransactions(LocalDate periodStart, LocalDate periodEnd) {
        LocalDateTime startTs = periodStart.atStartOfDay();
        LocalDateTime endTs = periodEnd.atStartOfDay();

        String sql = """
                SELECT COUNT(DISTINCT d.id)
                  FROM diaries d
                  JOIN diary_keywords k ON k.diary_id = d.id
                 WHERE d.created_at >= :startTs
                   AND d.created_at <  :endTs
                   AND d.deleted_at IS NULL
                   AND d.analysis_status = 'COMPLETED'
                """;

        var query = em.createNativeQuery(sql);
        query.setParameter("startTs", startTs);
        query.setParameter("endTs", endTs);

        Object result = query.getSingleResult();
        if (result instanceof Number n) return n.longValue();
        return 0L;
    }
}
