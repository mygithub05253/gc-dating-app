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
     * 관리자 신고 목록 조회.
     * status/reason/assignedTo/minPriority/slaOverdue 필터 + priority/sla 정렬.
     *
     * 정렬은 Pageable 의 Sort 로 전달하지 않고 JPQL 고정 (priority DESC, slaDeadline ASC).
     * sort 파라미터 분기는 Service 에서 별도 쿼리로 처리해도 되지만, 현 Phase 는 priority 고정.
     */
    @Query(value = """
            SELECT r FROM Report r
            LEFT JOIN FETCH r.assignedTo assigned
            LEFT JOIN FETCH r.resolvedBy resolver
            WHERE (:status IS NULL OR r.status = :status)
              AND (:reason IS NULL OR r.reason = :reason)
              AND (CAST(:minPriority AS integer) IS NULL OR r.priorityScore >= :minPriority)
              AND (
                    :assigneeFilter = 'ANY'
                 OR (:assigneeFilter = 'UNASSIGNED' AND r.assignedTo IS NULL)
                 OR (:assigneeFilter = 'ME' AND r.assignedTo.id = :assigneeId)
                 OR (:assigneeFilter = 'SPECIFIC' AND r.assignedTo.id = :assigneeId)
              )
              AND (:slaOverdue = FALSE OR (r.slaDeadline IS NOT NULL AND r.slaDeadline < :now))
            ORDER BY r.priorityScore DESC, r.slaDeadline ASC, r.id DESC
            """,
            countQuery = """
            SELECT COUNT(r) FROM Report r
            WHERE (:status IS NULL OR r.status = :status)
              AND (:reason IS NULL OR r.reason = :reason)
              AND (CAST(:minPriority AS integer) IS NULL OR r.priorityScore >= :minPriority)
              AND (
                    :assigneeFilter = 'ANY'
                 OR (:assigneeFilter = 'UNASSIGNED' AND r.assignedTo IS NULL)
                 OR (:assigneeFilter = 'ME' AND r.assignedTo.id = :assigneeId)
                 OR (:assigneeFilter = 'SPECIFIC' AND r.assignedTo.id = :assigneeId)
              )
              AND (:slaOverdue = FALSE OR (r.slaDeadline IS NOT NULL AND r.slaDeadline < :now))
            """)
    Page<Report> searchReports(
            @Param("status") Report.ReportStatus status,
            @Param("reason") Report.ReportReason reason,
            @Param("minPriority") Integer minPriority,
            @Param("assigneeFilter") String assigneeFilter,
            @Param("assigneeId") Long assigneeId,
            @Param("slaOverdue") boolean slaOverdue,
            @Param("now") LocalDateTime now,
            Pageable pageable
    );

    /** PENDING/IN_REVIEW 상태의 신고 전체 (SLA summary 계산용). */
    @Query("""
            SELECT r FROM Report r
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

    /** 신고 패턴 분석 §5.12 — 기간 내 접수된 전체 신고. */
    @Query("""
            SELECT r FROM Report r
            WHERE r.createdAt >= :from
              AND r.createdAt <  :to
            """)
    List<Report> findBetween(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );
}
