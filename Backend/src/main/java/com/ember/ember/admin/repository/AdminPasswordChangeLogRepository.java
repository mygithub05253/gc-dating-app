package com.ember.ember.admin.repository;

import com.ember.ember.admin.domain.AdminPasswordChangeLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AdminPasswordChangeLogRepository extends JpaRepository<AdminPasswordChangeLog, Long> {

    // ── Phase 3B §1 확장: 최근 비밀번호 변경 조회 ────────────────────────────

    /** 특정 관리자의 가장 최근 비밀번호 변경 1건. getMe() 의 passwordLastChangedAt 에 사용. */
    @Query("""
            SELECT p FROM AdminPasswordChangeLog p
            WHERE p.admin.id = :adminId
            ORDER BY p.changedAt DESC
            """)
    List<AdminPasswordChangeLog> findLatestByAdmin(@Param("adminId") Long adminId, Pageable pageable);

    default Optional<AdminPasswordChangeLog> findTopByAdminOrderByChangedAtDesc(Long adminId) {
        List<AdminPasswordChangeLog> list = findLatestByAdmin(adminId, Pageable.ofSize(1));
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    /** 본인 활동 로그 통합 조회용 — 최근 N건. */
    default List<AdminPasswordChangeLog> findRecentByAdmin(Long adminId, Pageable pageable) {
        return findLatestByAdmin(adminId, pageable);
    }

    /**
     * §13 비밀번호 변경 로그 검색 — SUPER_ADMIN 전용.
     */
    @Query(value = """
            SELECT p
              FROM AdminPasswordChangeLog p
              JOIN FETCH p.admin a
             WHERE (CAST(:adminId AS long) IS NULL OR a.id = :adminId)
               AND (CAST(:startAt AS timestamp) IS NULL OR p.changedAt >= :startAt)
               AND (CAST(:endAt AS timestamp) IS NULL OR p.changedAt < :endAt)
             ORDER BY p.changedAt DESC
            """,
            countQuery = """
            SELECT COUNT(p)
              FROM AdminPasswordChangeLog p
              JOIN p.admin a
             WHERE (CAST(:adminId AS long) IS NULL OR a.id = :adminId)
               AND (CAST(:startAt AS timestamp) IS NULL OR p.changedAt >= :startAt)
               AND (CAST(:endAt AS timestamp) IS NULL OR p.changedAt < :endAt)
            """)
    Page<AdminPasswordChangeLog> searchPasswordChangeLogs(@Param("adminId") Long adminId,
                                                           @Param("startAt") LocalDateTime startAt,
                                                           @Param("endAt") LocalDateTime endAt,
                                                           Pageable pageable);
}
