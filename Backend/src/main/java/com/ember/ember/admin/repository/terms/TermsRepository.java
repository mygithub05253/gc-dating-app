package com.ember.ember.admin.repository.terms;

import com.ember.ember.admin.domain.terms.Terms;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface TermsRepository extends JpaRepository<Terms, Long> {

    /** 관리자 약관 목록 — type/status 필터. */
    @Query("""
            SELECT t FROM Terms t
            WHERE (:type IS NULL OR t.type = :type)
              AND (:status IS NULL OR t.status = :status)
            ORDER BY t.createdAt DESC
            """)
    Page<Terms> searchForAdmin(
            @Param("type") Terms.TermsType type,
            @Param("status") Terms.TermsStatus status,
            Pageable pageable);

    /** 동일 유형의 ACTIVE 약관 조회 */
    Optional<Terms> findByTypeAndStatus(Terms.TermsType type, Terms.TermsStatus status);

    /** 동일 유형의 ACTIVE 약관 존재 여부 */
    boolean existsByTypeAndStatus(Terms.TermsType type, Terms.TermsStatus status);
}
