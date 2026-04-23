package com.ember.ember.admin.service.analytics;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * Apriori 연관 규칙 마이닝 — 설계서 §3.16 (B-4).
 *
 * 알고리즘:
 *   1. L1 생성: 빈발 1-아이템셋 (support >= minSupport)
 *   2. 반복 (k=2..maxK):
 *      a. 후보 C_k 생성 — L_{k-1} 쌍을 병합해 k-아이템셋 후보 만들기
 *      b. Apriori 가지치기 — C_k 의 모든 (k-1)-부분집합이 L_{k-1} 에 있는지 확인
 *      c. Transaction 스캔 → 실제 support 계산
 *      d. L_k = {c ∈ C_k : support(c) >= minSupport}
 *   3. 규칙 생성: 모든 빈발 아이템셋 Z 에서 가능한 모든 X→Y 분할 (X ∪ Y = Z, X ∩ Y = ∅)
 *      - confidence(X→Y) = support(Z) / support(X) >= minConfidence
 *      - lift(X→Y) = support(Z) / (support(X) * support(Y)) >= minLift
 *
 * 포트폴리오 요점:
 *   - Downward Closure Property: 빈발하지 않은 (k-1)-부분집합을 가진 k-후보는 빈발할 수 없음
 *   - 후보 생성은 O(|L_{k-1}|^2), 가지치기로 실제 스캔 대상을 크게 감소
 *   - 외부 라이브러리 없이 순수 Java 로 구현
 */
public final class AprioriAlgorithm {

    private AprioriAlgorithm() {}

    /**
     * Apriori 실행 결과.
     *
     * @param frequentItemsets 각 아이템셋 → transaction count
     *                          아이템셋 표현: 정렬된 List<String> (동치 보장)
     * @param totalTransactions |D|
     * @param rules            생성된 연관 규칙
     * @param l1Count          L1 크기
     * @param l2Count          L2 크기
     * @param l3Count          L3 크기 (maxK<3 이면 0)
     * @param candidatesPruned 가지치기로 제거된 후보 개수 (효율성 지표)
     */
    public record Result(
            Map<List<String>, Long> frequentItemsets,
            long totalTransactions,
            List<RuleResult> rules,
            int l1Count,
            int l2Count,
            int l3Count,
            int candidatesPruned
    ) {}

    public record RuleResult(
            List<String> antecedent,
            List<String> consequent,
            long count,
            double support,
            double confidence,
            double lift
    ) {}

    /**
     * @param transactions     각 transaction 의 item 집합 리스트. 중복 아이템 제거된 집합 가정.
     * @param minSupport       지지도 임계값 (예: 0.02)
     * @param minConfidence    신뢰도 임계값 (예: 0.3)
     * @param minLift          lift 임계값 (예: 1.2)
     * @param maxK             탐색 상한 (2 또는 3 권장)
     */
    public static Result run(List<Set<String>> transactions,
                             double minSupport,
                             double minConfidence,
                             double minLift,
                             int maxK) {
        long total = transactions == null ? 0 : transactions.size();
        if (total == 0 || maxK < 1) {
            return new Result(Collections.emptyMap(), 0, Collections.emptyList(), 0, 0, 0, 0);
        }
        long minCount = (long) Math.ceil(minSupport * total);
        if (minCount < 1) minCount = 1;
        int prunedTotal = 0;

        // 1) L1 생성
        Map<String, Long> itemCounts = new HashMap<>();
        for (Set<String> tx : transactions) {
            for (String item : tx) {
                itemCounts.merge(item, 1L, Long::sum);
            }
        }
        Map<List<String>, Long> l1 = new HashMap<>();
        for (Map.Entry<String, Long> entry : itemCounts.entrySet()) {
            if (entry.getValue() >= minCount) {
                l1.put(List.of(entry.getKey()), entry.getValue());
            }
        }

        Map<List<String>, Long> frequent = new HashMap<>(l1);
        Map<List<String>, Long> prevLevel = l1;
        int l2Size = 0, l3Size = 0;

        // 2) k=2..maxK 반복
        for (int k = 2; k <= maxK; k++) {
            if (prevLevel.isEmpty()) break;

            // a) 후보 생성 C_k
            Set<List<String>> candidates = generateCandidates(new ArrayList<>(prevLevel.keySet()), k);

            // b) Apriori 가지치기
            int beforePrune = candidates.size();
            Set<List<String>> pruned = new HashSet<>();
            Set<List<String>> prevKeys = prevLevel.keySet();
            for (List<String> cand : candidates) {
                if (!allSubsetsFrequent(cand, prevKeys, k - 1)) {
                    pruned.add(cand);
                }
            }
            candidates.removeAll(pruned);
            prunedTotal += beforePrune - candidates.size();

            // c) Transaction 스캔 → support 계산
            Map<List<String>, Long> candCounts = new HashMap<>();
            for (List<String> cand : candidates) candCounts.put(cand, 0L);
            for (Set<String> tx : transactions) {
                if (tx.size() < k) continue;
                for (List<String> cand : candidates) {
                    if (tx.containsAll(cand)) {
                        candCounts.merge(cand, 1L, Long::sum);
                    }
                }
            }

            // d) L_k 확정
            Map<List<String>, Long> lk = new HashMap<>();
            for (Map.Entry<List<String>, Long> entry : candCounts.entrySet()) {
                if (entry.getValue() >= minCount) {
                    lk.put(entry.getKey(), entry.getValue());
                }
            }
            if (k == 2) l2Size = lk.size();
            if (k == 3) l3Size = lk.size();
            frequent.putAll(lk);
            prevLevel = lk;
        }

        // 3) 규칙 생성
        List<RuleResult> rules = generateRules(frequent, total, minConfidence, minLift);

        return new Result(
                Collections.unmodifiableMap(frequent),
                total,
                Collections.unmodifiableList(rules),
                l1.size(),
                l2Size,
                l3Size,
                prunedTotal);
    }

    // =========================================================================
    // 후보 생성 (Apriori-gen)
    // =========================================================================

    /**
     * L_{k-1} 로부터 C_k 후보 생성.
     * 두 (k-1)-아이템셋이 앞 (k-2)개 아이템을 공유하면 병합해 k-아이템셋 생성.
     */
    private static Set<List<String>> generateCandidates(List<List<String>> prev, int k) {
        Set<List<String>> candidates = new HashSet<>();
        int n = prev.size();
        for (int i = 0; i < n; i++) {
            List<String> a = prev.get(i);
            for (int j = i + 1; j < n; j++) {
                List<String> b = prev.get(j);
                if (sharePrefix(a, b, k - 2)) {
                    List<String> merged = new ArrayList<>(k);
                    merged.addAll(a);
                    merged.add(b.get(k - 2));
                    Collections.sort(merged);
                    candidates.add(merged);
                }
            }
        }
        return candidates;
    }

    /**
     * 앞 prefixLen 개 아이템이 동일한지. 정렬된 리스트 전제.
     */
    private static boolean sharePrefix(List<String> a, List<String> b, int prefixLen) {
        for (int i = 0; i < prefixLen; i++) {
            if (!a.get(i).equals(b.get(i))) return false;
        }
        // 그리고 마지막 item 이 달라야 새 k-아이템셋이 됨
        return !a.get(prefixLen).equals(b.get(prefixLen));
    }

    /**
     * Apriori pruning: 후보의 모든 (k-1)-부분집합이 L_{k-1} 에 있는지 확인.
     */
    private static boolean allSubsetsFrequent(List<String> candidate,
                                              Set<List<String>> prevKeys,
                                              int subsetSize) {
        int n = candidate.size();
        for (int skip = 0; skip < n; skip++) {
            List<String> subset = new ArrayList<>(subsetSize);
            for (int i = 0; i < n; i++) {
                if (i != skip) subset.add(candidate.get(i));
            }
            if (!prevKeys.contains(subset)) return false;
        }
        return true;
    }

    // =========================================================================
    // 규칙 생성
    // =========================================================================

    private static List<RuleResult> generateRules(Map<List<String>, Long> frequent,
                                                  long total,
                                                  double minConfidence,
                                                  double minLift) {
        List<RuleResult> rules = new ArrayList<>();
        for (Map.Entry<List<String>, Long> entry : frequent.entrySet()) {
            List<String> itemset = entry.getKey();
            if (itemset.size() < 2) continue;
            long cntZ = entry.getValue();
            double supZ = (double) cntZ / total;

            // 모든 non-empty proper subset X 에 대해 Y = Z \ X
            List<List<String>> subsets = allProperSubsets(itemset);
            for (List<String> antecedent : subsets) {
                if (antecedent.isEmpty()) continue;
                List<String> consequent = minus(itemset, antecedent);
                if (consequent.isEmpty()) continue;

                Long cntX = frequent.get(antecedent);
                Long cntY = frequent.get(consequent);
                if (cntX == null || cntY == null || cntX == 0 || cntY == 0) continue;

                double supX = (double) cntX / total;
                double supY = (double) cntY / total;
                double confidence = (double) cntZ / cntX;
                double lift = confidence / supY;

                if (confidence >= minConfidence && lift >= minLift) {
                    rules.add(new RuleResult(
                            antecedent, consequent,
                            cntZ, supZ, confidence, lift));
                }
            }
        }
        // lift 내림차순 → confidence 내림차순 → support 내림차순
        rules.sort((a, b) -> {
            int c = Double.compare(b.lift(), a.lift());
            if (c != 0) return c;
            c = Double.compare(b.confidence(), a.confidence());
            if (c != 0) return c;
            return Double.compare(b.support(), a.support());
        });
        return rules;
    }

    /**
     * 정렬된 리스트의 모든 non-empty proper subset 생성.
     * 크기가 3 이하 전제 (maxK<=3) 이므로 O(2^k) 합리적.
     */
    private static List<List<String>> allProperSubsets(List<String> itemset) {
        int n = itemset.size();
        List<List<String>> result = new ArrayList<>();
        int limit = (1 << n) - 1; // 제외: empty(0), full(limit)
        for (int mask = 1; mask < limit; mask++) {
            List<String> subset = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                if ((mask & (1 << i)) != 0) subset.add(itemset.get(i));
            }
            // 정렬 보장
            result.add(subset);
        }
        return result;
    }

    private static List<String> minus(List<String> all, List<String> remove) {
        Set<String> removeSet = new HashSet<>(remove);
        List<String> result = new ArrayList<>(all.size());
        for (String item : all) {
            if (!removeSet.contains(item)) result.add(item);
        }
        // allProperSubsets 결과는 정렬되어 있고 all도 정렬되어 있어 minus 역시 자동 정렬.
        return new ArrayList<>(new TreeSet<>(result));
    }

    /**
     * 정렬된 리스트 여부 보장 도우미 (테스트 편의). 호출자는 사용 안 해도 됨.
     */
    @SuppressWarnings("unused")
    private static List<String> sortedCopy(Set<String> items) {
        List<String> list = new ArrayList<>(items);
        Collections.sort(list);
        return list;
    }

    @SuppressWarnings("unused")
    private static List<String> sortedCopy(String... items) {
        List<String> list = new ArrayList<>(Arrays.asList(items));
        Collections.sort(list);
        return list;
    }
}
