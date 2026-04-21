package com.ember.ember.report.repository;

import com.ember.ember.report.domain.SanctionHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * 제재 이력 Repository
 */
public interface SanctionHistoryRepository extends JpaRepository<SanctionHistory, Long> {

    /** 특정 사용자의 최근 활성 제재 조회 */
    Optional<SanctionHistory> findTopByUserIdOrderByStartedAtDesc(Long userId);
}
