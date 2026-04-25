package com.ember.ember.admin.repository;

import com.ember.ember.admin.domain.AdminAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

/**
 * 관리자 행위 감사 로그 저장소.
 * 쓰기: AOP({@code AdminAuditAspect})에서만 직접 호출.
 * 읽기: {@link #searchAuditLogs} — 관리자 API §13.8 (활동 로그 조회).
 */
public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, Long> {

    /**
     * 관리자 API §13.8 — 페이징 + 필터 조회.
     * 관리자 이름(admin.name) 조인은 Entity의 @ManyToOne fetch=LAZY 이므로,
     * 여기서는 JOIN FETCH로 N+1 방지하여 한 번에 가져온다.
     */
    @Query(value = """
            SELECT l
              FROM AdminAuditLog l
              JOIN FETCH l.admin a
             WHERE (CAST(:adminId AS long) IS NULL OR a.id = :adminId)
               AND (:action     IS NULL OR l.action = :action)
               AND (:targetType IS NULL OR l.targetType = :targetType)
               AND (CAST(:startAt AS timestamp) IS NULL OR l.performedAt >= :startAt)
               AND (CAST(:endAt AS timestamp) IS NULL OR l.performedAt <  :endAt)
               AND (:search     IS NULL
                    OR LOWER(l.ipAddress) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))
                    OR LOWER(l.detail)    LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')))
             ORDER BY l.performedAt DESC
            """,
            countQuery = """
            SELECT COUNT(l)
              FROM AdminAuditLog l
              JOIN l.admin a
             WHERE (CAST(:adminId AS long) IS NULL OR a.id = :adminId)
               AND (:action     IS NULL OR l.action = :action)
               AND (:targetType IS NULL OR l.targetType = :targetType)
               AND (CAST(:startAt AS timestamp) IS NULL OR l.performedAt >= :startAt)
               AND (CAST(:endAt AS timestamp) IS NULL OR l.performedAt <  :endAt)
               AND (:search     IS NULL
                    OR LOWER(l.ipAddress) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))
                    OR LOWER(l.detail)    LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')))
            """)
    Page<AdminAuditLog> searchAuditLogs(@Param("adminId") Long adminId,
                                         @Param("action") String action,
                                         @Param("targetType") String targetType,
                                         @Param("startAt") LocalDateTime startAt,
                                         @Param("endAt") LocalDateTime endAt,
                                         @Param("search") String search,
                                         Pageable pageable);
}
