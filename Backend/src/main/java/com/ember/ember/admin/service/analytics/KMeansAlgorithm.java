package com.ember.ember.admin.service.analytics;

import java.util.Arrays;
import java.util.Random;

/**
 * K-Means Clustering (Lloyd's Algorithm, k-means++ 초기화) — 설계서 §3.15 (B-3).
 *
 * 알고리즘:
 *   1. Z-score 정규화 (각 feature의 평균/표준편차 기준)
 *   2. k-means++ 로 centroid K개 초기화 — 거리 비례 확률로 분산 보장
 *   3. Lloyd 반복:
 *      a. Assignment: 각 점을 가장 가까운 centroid 에 배정 (유클리드 거리)
 *      b. Update: 각 클러스터의 centroid를 소속 점들의 평균으로 갱신
 *      c. 수렴 판정: max centroid shift < tolerance OR maxIter 도달
 *   4. Inertia(WCSS) 계산 — 클러스터 내 거리 제곱합
 *
 * 외부 라이브러리 없이 순수 Java. 재현성은 seed 로 보장.
 */
public final class KMeansAlgorithm {

    private KMeansAlgorithm() {}

    /**
     * K-Means 수행 결과.
     *
     * @param assignments   각 점의 클러스터 id (0-based, 길이 = n)
     * @param centroidsZ    Z-score 공간의 centroid (k × d)
     * @param centroidsRaw  원본 스케일 centroid (k × d)
     * @param featureMean   각 feature 평균 (정규화 계수, 길이 d)
     * @param featureStd    각 feature 표준편차 (길이 d)
     * @param iterations    Lloyd 반복 횟수
     * @param inertia       WCSS (Z-score 공간)
     * @param converged     수렴 여부
     * @param tolerance     수렴 판정 임계값
     * @param seed          사용된 시드
     */
    public record Result(
            int[] assignments,
            double[][] centroidsZ,
            double[][] centroidsRaw,
            double[] featureMean,
            double[] featureStd,
            int iterations,
            double inertia,
            boolean converged,
            double tolerance,
            long seed,
            double[] avgDistancePerCluster
    ) {}

    /**
     * @param data       n × d 원본 데이터 (복사하지 않음, 호출측이 읽기전용 보장)
     * @param k          목표 클러스터 수 (1 ≤ k ≤ n)
     * @param maxIter    Lloyd 최대 반복
     * @param tolerance  centroid shift L∞ 임계값 (예: 1e-4)
     * @param seed       재현용 시드
     */
    public static Result run(double[][] data, int k, int maxIter, double tolerance, long seed) {
        if (data == null || data.length == 0) {
            return emptyResult(k, maxIter, tolerance, seed);
        }
        int n = data.length;
        int d = data[0].length;
        int effectiveK = Math.max(1, Math.min(k, n));

        // 1) Z-score 정규화
        double[] mean = new double[d];
        double[] std = new double[d];
        computeMeanStd(data, mean, std);
        double[][] z = new double[n][d];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < d; j++) {
                z[i][j] = (data[i][j] - mean[j]) / std[j];
            }
        }

        // 2) k-means++ 초기화
        Random rng = new Random(seed);
        double[][] centroids = initializeKMeansPP(z, effectiveK, rng);

        // 3) Lloyd 반복
        int[] assignments = new int[n];
        Arrays.fill(assignments, -1);
        boolean converged = false;
        int iter = 0;

        while (iter < maxIter) {
            iter++;
            boolean anyChange = false;

            // Assignment 단계
            for (int i = 0; i < n; i++) {
                int best = nearestCentroid(z[i], centroids);
                if (assignments[i] != best) {
                    assignments[i] = best;
                    anyChange = true;
                }
            }

            // Update 단계 — 각 클러스터 centroid 를 소속 점들의 평균으로
            double[][] newCentroids = new double[effectiveK][d];
            int[] counts = new int[effectiveK];
            for (int i = 0; i < n; i++) {
                int c = assignments[i];
                counts[c]++;
                for (int j = 0; j < d; j++) {
                    newCentroids[c][j] += z[i][j];
                }
            }

            for (int c = 0; c < effectiveK; c++) {
                if (counts[c] == 0) {
                    // 빈 클러스터: 가장 먼 점을 이 centroid 로 승격 (empty cluster 방어)
                    int farthest = findFarthestPoint(z, assignments, centroids);
                    if (farthest >= 0) {
                        System.arraycopy(z[farthest], 0, newCentroids[c], 0, d);
                        assignments[farthest] = c;
                    }
                } else {
                    for (int j = 0; j < d; j++) {
                        newCentroids[c][j] /= counts[c];
                    }
                }
            }

            // 수렴 판정: L∞ (최대 centroid shift)
            double shift = maxShift(centroids, newCentroids);
            centroids = newCentroids;
            if (!anyChange || shift < tolerance) {
                converged = true;
                break;
            }
        }

        // 4) Inertia 및 클러스터별 평균 거리
        double inertia = 0.0;
        double[] avgDist = new double[effectiveK];
        int[] counts = new int[effectiveK];
        for (int i = 0; i < n; i++) {
            int c = assignments[i];
            double dist = euclidean(z[i], centroids[c]);
            inertia += dist * dist;
            avgDist[c] += dist;
            counts[c]++;
        }
        for (int c = 0; c < effectiveK; c++) {
            if (counts[c] > 0) avgDist[c] /= counts[c];
        }

        // centroid 원복 (Z → raw)
        double[][] centroidsRaw = new double[effectiveK][d];
        for (int c = 0; c < effectiveK; c++) {
            for (int j = 0; j < d; j++) {
                centroidsRaw[c][j] = centroids[c][j] * std[j] + mean[j];
            }
        }

        return new Result(
                assignments, centroids, centroidsRaw, mean, std,
                iter, inertia, converged, tolerance, seed, avgDist);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private static Result emptyResult(int k, int maxIter, double tolerance, long seed) {
        return new Result(
                new int[0], new double[0][0], new double[0][0],
                new double[0], new double[0],
                0, 0.0, true, tolerance, seed, new double[0]);
    }

    private static void computeMeanStd(double[][] data, double[] mean, double[] std) {
        int n = data.length;
        int d = data[0].length;
        // mean
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < d; j++) {
                mean[j] += data[i][j];
            }
        }
        for (int j = 0; j < d; j++) {
            mean[j] /= n;
        }
        // std (population)
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < d; j++) {
                double diff = data[i][j] - mean[j];
                std[j] += diff * diff;
            }
        }
        for (int j = 0; j < d; j++) {
            std[j] = Math.sqrt(std[j] / n);
            if (std[j] < 1e-9) std[j] = 1.0; // 상수 feature 방어 (정규화 시 0으로 나누기 금지)
        }
    }

    private static double[][] initializeKMeansPP(double[][] z, int k, Random rng) {
        int n = z.length;
        int d = z[0].length;
        double[][] centroids = new double[k][d];

        // 1st centroid: 균일 랜덤
        int first = rng.nextInt(n);
        System.arraycopy(z[first], 0, centroids[0], 0, d);

        double[] minDistSquared = new double[n];
        Arrays.fill(minDistSquared, Double.POSITIVE_INFINITY);
        for (int i = 0; i < n; i++) {
            double dist = euclidean(z[i], centroids[0]);
            minDistSquared[i] = dist * dist;
        }

        for (int c = 1; c < k; c++) {
            double total = 0.0;
            for (double v : minDistSquared) total += v;
            if (total <= 0.0) {
                // 모든 점이 기존 centroid 와 동일 → 임의 점 선택
                System.arraycopy(z[rng.nextInt(n)], 0, centroids[c], 0, d);
            } else {
                double pick = rng.nextDouble() * total;
                double acc = 0.0;
                int chosen = n - 1;
                for (int i = 0; i < n; i++) {
                    acc += minDistSquared[i];
                    if (acc >= pick) {
                        chosen = i;
                        break;
                    }
                }
                System.arraycopy(z[chosen], 0, centroids[c], 0, d);
            }
            // minDistSquared 갱신
            for (int i = 0; i < n; i++) {
                double dist = euclidean(z[i], centroids[c]);
                double dsq = dist * dist;
                if (dsq < minDistSquared[i]) minDistSquared[i] = dsq;
            }
        }

        return centroids;
    }

    private static int nearestCentroid(double[] point, double[][] centroids) {
        int best = 0;
        double bestDist = Double.POSITIVE_INFINITY;
        for (int c = 0; c < centroids.length; c++) {
            double dist = squaredEuclidean(point, centroids[c]);
            if (dist < bestDist) {
                bestDist = dist;
                best = c;
            }
        }
        return best;
    }

    private static int findFarthestPoint(double[][] z, int[] assignments, double[][] centroids) {
        int best = -1;
        double bestDist = -1.0;
        for (int i = 0; i < z.length; i++) {
            if (assignments[i] < 0) continue;
            double dist = squaredEuclidean(z[i], centroids[assignments[i]]);
            if (dist > bestDist) {
                bestDist = dist;
                best = i;
            }
        }
        return best;
    }

    private static double maxShift(double[][] a, double[][] b) {
        double max = 0.0;
        for (int c = 0; c < a.length; c++) {
            double dist = euclidean(a[c], b[c]);
            if (dist > max) max = dist;
        }
        return max;
    }

    private static double euclidean(double[] a, double[] b) {
        return Math.sqrt(squaredEuclidean(a, b));
    }

    private static double squaredEuclidean(double[] a, double[] b) {
        double sum = 0.0;
        for (int i = 0; i < a.length; i++) {
            double diff = a[i] - b[i];
            sum += diff * diff;
        }
        return sum;
    }
}
