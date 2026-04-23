package com.ember.ember.admin.dto.analytics;

import java.time.LocalDate;
import java.util.List;

/**
 * 연관 규칙 마이닝 (Apriori) — 설계서 §3.16 (B-4).
 *
 * 각 일기를 "transaction" 으로, 부착된 태그(tag_type:label)를 "item" 으로 삼아
 * 빈발 아이템셋(frequent itemset)과 연관 규칙(association rule)을 도출.
 *
 * 수식:
 *   - support(X)       = |{T : X ⊆ T}| / |D|
 *   - confidence(X→Y)  = support(X ∪ Y) / support(X)
 *   - lift(X→Y)        = confidence(X→Y) / support(Y)
 *   - lift > 1   : X 와 Y 가 양의 연관
 *   - lift = 1   : 독립
 *   - lift < 1   : 음의 연관 (상호 배제)
 *
 * 포트폴리오 가치:
 *   - Apriori 의 "downward closure property" 적용 — 빈발 k-1 아이템셋만 조합해 k 후보 생성
 *   - 가지치기(Pruning) 로 후보 공간을 지수 → 다항 시간으로 축소
 *   - 소개팅앱 맥락: "HAPPY + CAFE 감성 동시 출현 → PLAYFUL tone 확률 2.1배 lift" 같은 인사이트
 */
public record AssociationRulesResponse(
        Period period,
        long totalTransactions,
        long totalItems,
        Params params,
        Stats stats,
        List<FrequentItemset> frequentItemsets,
        List<Rule> rules,
        Meta meta
) {
    public record Period(LocalDate startDate, LocalDate endDate, String timezone) {}

    /**
     * @param minSupport     지지도 최소 임계값 (0~1)
     * @param minConfidence  신뢰도 최소 임계값 (0~1)
     * @param minLift        lift 최소 임계값 (보통 1.0 이상)
     * @param maxItemsetSize 탐색 상한 k (2~3 권장)
     * @param tagTypes       마이닝에 포함할 tag_type 목록
     */
    public record Params(
            double minSupport,
            double minConfidence,
            double minLift,
            int maxItemsetSize,
            List<String> tagTypes
    ) {}

    /**
     * @param l1Size         L1 빈발 아이템 개수
     * @param l2Size         L2 빈발 아이템쌍 개수
     * @param l3Size         L3 빈발 3-아이템셋 개수 (maxItemsetSize≥3 일 때만)
     * @param ruleCount      생성된 연관 규칙 수
     * @param candidatePruned 가지치기로 제거된 후보 수 (효율성 지표)
     */
    public record Stats(
            int l1Size,
            int l2Size,
            int l3Size,
            int ruleCount,
            int candidatePruned
    ) {}

    /**
     * @param items   아이템 집합 (예: ["EMOTION:HAPPY", "LIFESTYLE:CAFE"])
     * @param count   해당 아이템셋을 모두 포함하는 transaction 수
     * @param support count / totalTransactions
     */
    public record FrequentItemset(List<String> items, long count, double support) {}

    /**
     * @param antecedent 조건부 (X)
     * @param consequent 결과부 (Y)
     * @param count      X ∪ Y 동시 출현 수
     * @param support    support(X ∪ Y)
     * @param confidence P(Y | X)
     * @param lift       support(X ∪ Y) / (support(X) * support(Y))
     */
    public record Rule(
            List<String> antecedent,
            List<String> consequent,
            long count,
            double support,
            double confidence,
            double lift
    ) {}

    public record Meta(
            String algorithm,        // "apriori"
            int kAnonymityMin,
            boolean degraded,
            String dataSourceVersion
    ) {}
}
