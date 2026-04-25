package com.ember.ember.notification.repository;

import com.ember.ember.notification.domain.Faq;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * FAQ Repository
 */
public interface FaqRepository extends JpaRepository<Faq, Long> {

    /** 활성화된 FAQ 목록 (정렬순) */
    List<Faq> findByIsActiveTrueAndDeletedAtIsNullOrderBySortOrder();

    /** 관리자 §22 FAQ 목록 — category/isActive 필터. */
    @Query("""
            SELECT f FROM Faq f
            WHERE f.deletedAt IS NULL
              AND (:category IS NULL OR f.category = :category)
              AND (:isActive IS NULL OR f.isActive = :isActive)
            ORDER BY f.sortOrder ASC
            """)
    Page<Faq> searchForAdmin(
            @Param("category") String category,
            @Param("isActive") Boolean isActive,
            Pageable pageable);
}
