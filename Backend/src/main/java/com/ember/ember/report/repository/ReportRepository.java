package com.ember.ember.report.repository;

import com.ember.ember.report.domain.Report;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 신고 Repository.
 * 사용자 신고 접수용 쿼리 + 관리자 대시보드용 조회 쿼리 (Phase A-3).
 */
public interface ReportRepository extends JpaRepository<Report, Long> {

    // ── 사용자 접수용 ───────────────────────────────────────────────────────
    /** 동일 대상 7일 내 중복 신고 존재 여부. */
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

    /** 특정 사용자에 대한 누적 신고 건수 (모든 상태 포함). */
    long countByTargetUserId(Long targetUserId);

    /**
     * 신고자가 낸 신고 중 최근 {@code since} 이후 DISMISSED 된 건수.
     * 허위 신고 반복자 감점(priority score) 계산용.
     */
    @Query("""
            SELECT COUNT(r) FROM Report r
            WHERE r.reporter.id = :reporterId
              AND r.status = com.ember.ember.report.domain.Report.ReportStatus.DISMISSED
              AND r.createdAt >= :since
            """)
    long countDismissedByReporterSince(
            @Param("reporterId") Long reporterId,
            @Param("since") LocalDateTime since
    );

    // ── 관리자 대시보드용 (§5.1~5.7) ────────────────────────────────────────
    /**
     * 관리자 신고 목록 조회 — native query.
     * JPQL 에서 null enum 파라미터가 bytea 로 추론되는 Hibernate 버그를 회피하기 위해
     * native SQL + CAST(:param AS varchar) 패턴을 사용한다.
     * Service 에서 enum.name() 문자열로 변환하여 전달해야 한다.
     */
    @Query(value = """
            SELECT r.* FROM reports r
            LEFT JOIN admin_accounts assigned ON assigned.id = r.assigned_to
            WHERE (CAST(:status AS varchar) IS NULL OR r.status = CAST(:status AS varchar))
              AND (CAST(:reason AS varchar) IS NULL OR r.reason = CAST(:reason AS varchar))
              AND (CAST(:minPriority AS integer) IS NULL OR r.priority_score >= CAST(:minPriority AS integer))
              AND (
                    :assigneeFilter = 'ANY'
                 OR (:assigneeFilter = 'UNASSIGNED' AND r.assigned_to IS NULL)
                 OR (:assigneeFilter = 'ME' AND r.assigned_to = CAST(:assigneeId AS bigint))
                 OR (:assigneeFilter = 'SPECIFIC' AND r.assigned_to = CAST(:assigneeId AS bigint))
              )
              AND (CAST(:slaOverdue AS boolean) = FALSE OR (r.sla_deadline IS NOT NULL AND r.sla_deadline < CAST(:now AS timestamp)))
            ORDER BY r.priority_score DESC NULLS LAST, r.sla_deadline ASC NULLS LAST, r.id DESC
            """,
            countQuery = """
            SELECT COUNT(*) FROM reports r
            WHERE (CAST(:status AS varchar) IS NULL OR r.status = CAST(:status AS varchar))
              AND (CAST(:reason AS varchar) IS NULL OR r.reason = CAST(:reason AS varchar))
              AND (CAST(:minPriority AS integer) IS NULL OR r.priority_score >= CAST(:minPriority AS integer))
              AND (
                    :assigneeFilter = 'ANY'
                 OR (:assigneeFilter = 'UNASSIGNED' AND r.assigned_to IS NULL)
                 OR (:assigneeFilter = 'ME' AND r.assigned_to = CAST(:assigneeId AS bigint))
                 OR (:assigneeFilter = 'SPECIFIC' AND r.assigned_to = CAST(:assigneeId AS bigint))
              )
              AND (CAST(:slaOverdue AS boolean) = FALSE OR (r.sla_deadline IS NOT NULL AND r.sla_deadline < CAST(:now AS timestamp)))
            """,
            nativeQuery = true)
    Page<Report> searchReports(
            @Param("status") String status,
            @Param("reason") String reason,
            @Param("minPriority") Integer minPriority,
            @Param("assigneeFilter") String assigneeFilter,
            @Param("assigneeId") Long assigneeId,
            @Param("slaOverdue") boolean slaOverdue,
            @Param("now") LocalDateTime now,
            Pageable pageable
    );

    /** PENDING/IN_REVIEW 상태의 신고 전체 (SLA summary 계산용). JOIN FETCH 로 N+1 방지. */
    @Query("""
            SELECT r FROM Report r
            JOIN FETCH r.targetUser
            JOIN FETCH r.reporter
            WHERE r.status IN (com.ember.ember.report.domain.Report.ReportStatus.PENDING,
                               com.ember.ember.report.domain.Report.ReportStatus.IN_REVIEW)
            """)
    List<Report> findAllPendingForSlaSummary();

    /** 피신고자 기준 직전 처리된 신고 이력 (상세 화면 targetPreviousReports). */
    @Query("""
            SELECT r FROM Report r
            WHERE r.targetUser.id = :targetUserId
              AND r.id <> :excludeReportId
            ORDER BY r.createdAt DESC
            """)
    List<Report> findPreviousReportsOfTarget(
            @Param("targetUserId") Long targetUserId,
            @Param("excludeReportId") Long excludeReportId,
            Pageable pageable
    );

    /** 신고 패턴 분석 §5.12 — 기간 내 접수된 전체 신고. JOIN FETCH 로 N+1 방지. */
    @Query("""
            SELECT r FROM Report r
            JOIN FETCH r.targetUser
            JOIN FETCH r.reporter
            WHERE r.createdAt >= :from
              AND r.createdAt <  :to
            """)
    List<Report> findBetween(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );
}
