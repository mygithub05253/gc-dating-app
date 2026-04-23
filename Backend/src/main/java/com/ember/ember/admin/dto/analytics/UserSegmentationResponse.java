package com.ember.ember.admin.dto.analytics;

import java.time.LocalDate;
import java.util.List;

/**
 * 사용자 세그먼테이션 분석 — 설계서 §3.15 (B-3).
 *
 * 두 방법의 병행 결과:
 *   1. RFM Quintile (NTILE 기반 해석 가능 세그먼트)
 *      - R(Recency): 마지막 활동 후 경과일 역순 점수 (낮을수록 5점)
 *      - F(Frequency): 기간 내 일기 작성 빈도 점수
 *      - M(Monetary → Engagement): 교환일기 참여·AI 분석 완료 가중합 점수
 *      - 5×5×5 = 125 조합 → Champions / Loyal / Promising / At-Risk / Lost 5개 라벨
 *
 *   2. K-Means Clustering (Lloyd 알고리즘, k-means++ 초기화)
 *      - Z-score 정규화 후 유클리드 거리 기반 수렴
 *      - 재현성: seed=42 고정
 *      - Elbow 지표용 inertia 반환 (클라이언트 K 선택)
 *
 * method 파라미터로 어느 방식을 계산할지 선택.
 * k-anonymity: 세그먼트/클러스터 size < kMin 시 마스킹 (서비스 계층).
 */
public record UserSegmentationResponse(
        Period period,
        String method,                 // "RFM" | "KMEANS" | "BOTH"
        int kRequested,                // 요청된 K-Means 클러스터 수
        long totalUsers,
        RfmSummary rfmSummary,         // method=KMEANS 단독 시 null
        KMeansSummary kmeansSummary,   // method=RFM 단독 시 null
        Meta meta
) {
    public record Period(LocalDate startDate, LocalDate endDate, String timezone) {}

    // ---- RFM ---------------------------------------------------------------

    /**
     * @param segments 세그먼트별 집계
     * @param notes    해석 보조 문구 (예: "Champions: 충성 고객 — R=4-5,F=4-5,E=4-5")
     */
    public record RfmSummary(
            List<RfmSegment> segments,
            List<String> notes
    ) {}

    /**
     * @param label   "CHAMPIONS" | "LOYAL" | "PROMISING" | "AT_RISK" | "LOST"
     * @param size    세그먼트 사용자 수 (masked 적용 시 원본)
     * @param masked  k<kMin 여부
     * @param avgR    평균 Recency (일)
     * @param avgF    평균 Frequency (일기 수)
     * @param avgE    평균 Engagement (가중합 점수)
     * @param share   전체 대비 비율 (0~1)
     */
    public record RfmSegment(
            String label,
            long size,
            boolean masked,
            Double avgR,
            Double avgF,
            Double avgE,
            Double share
    ) {}

    // ---- K-Means -----------------------------------------------------------

    /**
     * @param clusters    클러스터별 집계
     * @param iterations  Lloyd 반복 횟수
     * @param inertia     Within-Cluster Sum of Squares (WCSS) — Elbow 방법의 y축
     * @param converged   수렴 여부 (tolerance 이내 centroid 이동)
     * @param tolerance   수렴 판정 임계값
     * @param seed        난수 시드 (재현성)
     */
    public record KMeansSummary(
            List<Cluster> clusters,
            int iterations,
            Double inertia,
            boolean converged,
            Double tolerance,
            Long seed
    ) {}

    /**
     * @param clusterId     0-based 클러스터 id
     * @param label         자동 라벨링 (avgRFE 값 기반, 예: "LOW_ENGAGEMENT")
     * @param size          클러스터 소속 사용자 수
     * @param masked        k<kMin 여부
     * @param centroidR     centroid Recency (원본 스케일)
     * @param centroidF     centroid Frequency (원본 스케일)
     * @param centroidE     centroid Engagement (원본 스케일)
     * @param centroidRZ    centroid Recency (Z-score)
     * @param centroidFZ    centroid Frequency (Z-score)
     * @param centroidEZ    centroid Engagement (Z-score)
     * @param avgDistance   클러스터 내 평균 거리 (응집도)
     */
    public record Cluster(
            int clusterId,
            String label,
            long size,
            boolean masked,
            Double centroidR,
            Double centroidF,
            Double centroidE,
            Double centroidRZ,
            Double centroidFZ,
            Double centroidEZ,
            Double avgDistance
    ) {}

    public record Meta(
            String algorithm,          // "rfm-quintile + k-means-lloyd"
            int kAnonymityMin,
            boolean degraded,
            String dataSourceVersion
    ) {}
}
