package com.ember.ember.aireport.repository;

import com.ember.ember.aireport.domain.LifestyleAnalysisLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * 라이프스타일 분석 이력 Repository (M6).
 *
 * 주요 조회:
 *   - 사용자의 최신 분석 이력 1건 조회 (관리자 확인·디버깅용)
 */
public interface LifestyleAnalysisLogRepository extends JpaRepository<LifestyleAnalysisLog, Long> {

    /**
     * 특정 사용자의 가장 최근 라이프스타일 분석 이력 조회.
     * 분석 완료 시각(analyzedAt) 내림차순으로 정렬하여 첫 번째 행을 반환.
     *
     * @param userId 사용자 PK
     * @return 최신 분석 이력 (없으면 Optional.empty())
     */
    Optional<LifestyleAnalysisLog> findTopByUserIdOrderByAnalyzedAtDesc(Long userId);
}
