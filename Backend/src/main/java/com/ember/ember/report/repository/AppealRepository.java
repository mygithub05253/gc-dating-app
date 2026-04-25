package com.ember.ember.report.repository;

import com.ember.ember.report.domain.Appeal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 이의신청 Repository
 */
public interface AppealRepository extends JpaRepository<Appeal, Long> {

    /** 특정 제재건에 대해 PENDING 이의신청 존재 여부 */
    boolean existsBySanctionIdAndStatus(Long sanctionId, Appeal.AppealStatus status);

    /** 관리자용 이의신청 검색 — 상태 필터 + 페이징 */
    @Query("""
            SELECT a FROM Appeal a
            JOIN FETCH a.user u
            JOIN FETCH a.sanction s
             WHERE (:status IS NULL OR a.status = :status)
            ORDER BY a.createdAt DESC
            """)
    Page<Appeal> searchForAdmin(@Param("status") Appeal.AppealStatus status,
                                Pageable pageable);
}
