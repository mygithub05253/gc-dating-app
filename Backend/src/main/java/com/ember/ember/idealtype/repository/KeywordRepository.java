package com.ember.ember.idealtype.repository;

import com.ember.ember.idealtype.domain.Keyword;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface KeywordRepository extends JpaRepository<Keyword, Long> {

    List<Keyword> findByCategoryAndIsActiveTrueOrderByDisplayOrder(String category);

    List<Keyword> findByIsActiveTrueOrderByDisplayOrder();

    /** 관리자 §24 키워드 목록 — category/isActive 필터. */
    @Query("""
            SELECT k FROM Keyword k
            WHERE (:category IS NULL OR k.category = :category)
              AND (:isActive IS NULL OR k.isActive = :isActive)
            ORDER BY k.category ASC, k.displayOrder ASC
            """)
    Page<Keyword> searchForAdmin(
            @Param("category") String category,
            @Param("isActive") Boolean isActive,
            Pageable pageable);

    /** 라벨 중복 확인 */
    boolean existsByLabel(String label);

    /** 카테고리별 키워드 수 */
    int countByCategoryAndIsActiveTrue(String category);
}
