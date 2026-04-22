package com.ember.ember.report.repository;

import com.ember.ember.report.domain.SanctionHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

/**
 * 제재 이력 Repository
 */
public interface SanctionHistoryRepository extends JpaRepository<SanctionHistory, Long> {

    /** 특정 사용자의 최근 활성 제재 조회 */
    Optional<SanctionHistory> findTopByUserIdOrderByStartedAtDesc(Long userId);

    /**
     * 특정 사용자의 제재 이력 전체 — 관리자 API §3.7.
     * JOIN FETCH 로 admin 지연 로딩 회피.
     */
    @Query("""
            SELECT s FROM SanctionHistory s
              LEFT JOIN FETCH s.admin a
             WHERE s.user.id = :userId
             ORDER BY s.startedAt DESC
            """)
    List<SanctionHistory> findAllByUserIdWithAdmin(Long userId);
}
