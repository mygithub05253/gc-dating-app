package com.ember.ember.report.repository;

import com.ember.ember.report.domain.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

/**
 * 신고 Repository
 */
public interface ReportRepository extends JpaRepository<Report, Long> {

    /** 동일 대상 7일 내 중복 신고 존재 여부 */
    @Query("""
            SELECT COUNT(r) > 0 FROM Report r
            WHERE r.reporter.id = :reporterId
              AND r.targetUser.id = :targetUserId
              AND r.createdAt >= :since
            """)
    boolean existsRecentReport(
            @Param("reporterId") Long reporterId,
            @Param("targetUserId") Long targetUserId,
            @Param("since") LocalDateTime since
    );

    /** 특정 사용자에 대한 누적 신고 건수 */
    long countByTargetUserId(Long targetUserId);
}
