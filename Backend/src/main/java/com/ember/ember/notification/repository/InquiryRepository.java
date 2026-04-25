package com.ember.ember.notification.repository;

import com.ember.ember.notification.domain.Inquiry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * 고객 문의 Repository
 */
public interface InquiryRepository extends JpaRepository<Inquiry, Long> {

    /** 내 문의 목록 (최신순) */
    List<Inquiry> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** 내 문의 상세 (소유권 검증) */
    Optional<Inquiry> findByIdAndUserId(Long id, Long userId);

    /** 진행 중인 문의 수 (OPEN + IN_PROGRESS) */
    long countByUserIdAndStatusIn(Long userId, List<Inquiry.InquiryStatus> statuses);

    /** 관리자용 문의 검색 — 상태/카테고리 필터 + 페이징 */
    @Query("""
            SELECT i FROM Inquiry i
            JOIN FETCH i.user u
             WHERE (:status IS NULL OR i.status = :status)
               AND (:category IS NULL OR i.category = :category)
            ORDER BY i.createdAt DESC
            """)
    Page<Inquiry> searchForAdmin(@Param("status") Inquiry.InquiryStatus status,
                                 @Param("category") String category,
                                 Pageable pageable);
}
