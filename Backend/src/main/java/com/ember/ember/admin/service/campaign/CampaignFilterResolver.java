package com.ember.ember.admin.service.campaign;

import com.ember.ember.admin.dto.campaign.NotificationCampaignDto.FilterConditions;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 캠페인 발송 대상 필터 해석기 (명세 §11.1.3 Step 3 / Step 4).
 *
 * <p>{@link FilterConditions} 구조를 동적 JPQL WHERE 절로 변환하여
 * 1) 대상 사용자 수 카운트 (미리보기), 2) 사용자 ID 목록 추출 (Phase 2-B 워커용)을 지원한다.</p>
 *
 * <p><b>제재 사용자 자동 제외</b>: SUSPENDED/BANNED/DEACTIVATED 사용자는 무조건 제외 (명세 Step 2 사전조건).</p>
 *
 * <p>Phase 2-A에서 지원하는 필터:</p>
 * <ul>
 *   <li>가입일 범위 (createdAt)</li>
 *   <li>마지막 접속일 범위 (lastLoginAt — 명세상 lastActiveAt이지만 컬럼은 lastLoginAt)</li>
 *   <li>매칭 성공 여부 (exchange_rooms 존재 여부)</li>
 *   <li>AI 동의 여부 (ai_consent_log 최신 GRANT 존재)</li>
 *   <li>성별 필터</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CampaignFilterResolver {

    private static final Set<String> EXCLUDED_STATUS = Set.of(
            "SUSPEND_7D", "SUSPEND_30D", "BANNED", "DEACTIVATED"
    );

    private final EntityManager entityManager;
    private final ObjectMapper objectMapper;

    /** FilterConditions 객체를 JSON 문자열로 직렬화하여 컬럼 저장용. */
    public String toJson(FilterConditions conditions) {
        if (conditions == null) {
            return "{}";
        }
        try {
            return objectMapper.writeValueAsString(conditions);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("필터 조건 JSON 직렬화 실패: " + e.getMessage(), e);
        }
    }

    /** JSON 문자열을 FilterConditions 객체로 역직렬화. */
    public FilterConditions fromJson(String json) {
        if (json == null || json.isBlank() || "{}".equals(json.trim())) {
            return FilterConditions.empty();
        }
        try {
            return objectMapper.readValue(json, FilterConditions.class);
        } catch (JsonProcessingException e) {
            log.warn("[CampaignFilterResolver] 필터 조건 역직렬화 실패 — fallback empty 반환. json={}, 이유={}",
                    json, e.getMessage());
            return FilterConditions.empty();
        }
    }

    /**
     * 미리보기 — 필터 조건에 매치되는 활성 사용자 수만 카운트.
     */
    public long countTargets(FilterConditions conditions) {
        BuiltQuery built = buildJpql(conditions, true);
        Query query = entityManager.createQuery(built.jpql);
        built.params.forEach(query::setParameter);
        Object result = query.getSingleResult();
        return result instanceof Number n ? n.longValue() : 0L;
    }

    /**
     * 발송 대상 사용자 ID 목록. Phase 2-B 워커용 — 청크(1k) 단위 페이지 페치 권장.
     */
    @SuppressWarnings("unchecked")
    public List<Long> findTargetUserIds(FilterConditions conditions, int offset, int limit) {
        BuiltQuery built = buildJpql(conditions, false);
        Query query = entityManager.createQuery(built.jpql);
        built.params.forEach(query::setParameter);
        query.setFirstResult(offset);
        query.setMaxResults(limit);
        return (List<Long>) query.getResultList();
    }

    /**
     * 동적 JPQL 생성 — 활성 사용자 + 조건별 EXISTS/필터 결합.
     * countOnly=true면 SELECT COUNT(u), false면 SELECT u.id.
     */
    private BuiltQuery buildJpql(FilterConditions conditions, boolean countOnly) {
        FilterConditions safe = conditions != null ? conditions : FilterConditions.empty();
        List<String> wheres = new ArrayList<>();
        Map<String, Object> params = new HashMap<>();

        // 제재 상태 자동 제외
        wheres.add("u.status NOT IN :excludedStatus");
        params.put("excludedStatus", EXCLUDED_STATUS.stream()
                .map(s -> com.ember.ember.user.domain.User.UserStatus.valueOf(s))
                .toList());

        if (safe.signedUpAfter() != null) {
            wheres.add("u.createdAt >= :signedUpAfter");
            params.put("signedUpAfter", safe.signedUpAfter());
        }
        if (safe.signedUpBefore() != null) {
            wheres.add("u.createdAt < :signedUpBefore");
            params.put("signedUpBefore", safe.signedUpBefore());
        }
        if (safe.lastActiveAfter() != null) {
            wheres.add("u.lastLoginAt >= :lastActiveAfter");
            params.put("lastActiveAfter", safe.lastActiveAfter());
        }
        if (safe.lastActiveBefore() != null) {
            wheres.add("u.lastLoginAt < :lastActiveBefore");
            params.put("lastActiveBefore", safe.lastActiveBefore());
        }
        if (safe.genders() != null && !safe.genders().isEmpty()) {
            Set<com.ember.ember.user.domain.User.Gender> genderEnums = new LinkedHashSet<>();
            for (String g : safe.genders()) {
                try {
                    genderEnums.add(com.ember.ember.user.domain.User.Gender.valueOf(g));
                } catch (IllegalArgumentException e) {
                    log.warn("[CampaignFilterResolver] 알 수 없는 성별 값 무시 — value={}", g);
                }
            }
            if (!genderEnums.isEmpty()) {
                wheres.add("u.gender IN :genders");
                params.put("genders", genderEnums);
            }
        }
        if (safe.hasMatched() != null) {
            String op = safe.hasMatched() ? "EXISTS" : "NOT EXISTS";
            wheres.add(op + " (SELECT 1 FROM ExchangeRoom r " +
                       " WHERE r.userA.id = u.id OR r.userB.id = u.id)");
        }
        if (safe.aiConsent() != null) {
            // 가장 최근 ai_consent_log.action 이 GRANT 인지 판단
            // (LATEST per user) -- JPQL 단순화를 위해 최근 동의=GRANT 인 케이스를 EXISTS로 근사 처리
            String op = safe.aiConsent() ? "EXISTS" : "NOT EXISTS";
            wheres.add(op + " (SELECT 1 FROM AiConsentLog l " +
                       " WHERE l.user.id = u.id AND l.action = 'GRANT' " +
                       "   AND l.actedAt = (SELECT MAX(l2.actedAt) FROM AiConsentLog l2 WHERE l2.user.id = u.id))");
        }

        String selection = countOnly ? "SELECT COUNT(u)" : "SELECT u.id";
        String orderBy   = countOnly ? "" : " ORDER BY u.id ASC";
        String jpql = selection + " FROM User u " +
                      "WHERE " + String.join(" AND ", wheres) + orderBy;
        return new BuiltQuery(jpql, params);
    }

    private record BuiltQuery(String jpql, Map<String, Object> params) {}
}
