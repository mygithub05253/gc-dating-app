package com.ember.ember.admin.repository;

import com.ember.ember.admin.domain.AdminPiiAccessLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

/**
 * PII(개인식별정보) 접근 감사 로그 저장소.
 * AOP({@code PiiAccessAspect})에서만 직접 호출하며,
 * 조회는 §13 감사 로그 API에서 사용한다.
 */
public interface AdminPiiAccessLogRepository extends JpaRepository<AdminPiiAccessLog, Long> {

    /**
     * §13 PII 접근 로그 검색 — SUPER_ADMIN 전용.
     */
    @Query(value = """
            SELECT p
              FROM AdminPiiAccessLog p
              JOIN FETCH p.admin a
              JOIN FETCH p.targetUser u
             WHERE (CAST(:adminId AS long) IS NULL OR a.id = :adminId)
               AND (CAST(:targetUserId AS long) IS NULL OR u.id = :targetUserId)
               AND (:accessType IS NULL OR p.accessType = :accessType)
               AND (CAST(:startAt AS timestamp) IS NULL OR p.accessedAt >= :startAt)
               AND (CAST(:endAt AS timestamp) IS NULL OR p.accessedAt < :endAt)
             ORDER BY p.accessedAt DESC
            """,
            countQuery = """
            SELECT COUNT(p)
              FROM AdminPiiAccessLog p
              JOIN p.admin a
              JOIN p.targetUser u
             WHERE (CAST(:adminId AS long) IS NULL OR a.id = :adminId)
               AND (CAST(:targetUserId AS long) IS NULL OR u.id = :targetUserId)
               AND (:accessType IS NULL OR p.accessType = :accessType)
               AND (CAST(:startAt AS timestamp) IS NULL OR p.accessedAt >= :startAt)
               AND (CAST(:endAt AS timestamp) IS NULL OR p.accessedAt < :endAt)
            """)
    Page<AdminPiiAccessLog> searchPiiAccessLogs(@Param("adminId") Long adminId,
                                                 @Param("targetUserId") Long targetUserId,
                                                 @Param("accessType") String accessType,
                                                 @Param("startAt") LocalDateTime startAt,
                                                 @Param("endAt") LocalDateTime endAt,
                                                 Pageable pageable);
}
