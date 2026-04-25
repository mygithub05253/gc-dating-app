package com.ember.ember.notification.repository;

import com.ember.ember.notification.domain.TutorialPage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TutorialPageRepository extends JpaRepository<TutorialPage, Long> {

    List<TutorialPage> findByIsActiveTrueOrderByPageOrder();

    /** 관리자 §23 튜토리얼 목록 — isActive 필터. */
    @Query("""
            SELECT p FROM TutorialPage p
            WHERE (:isActive IS NULL OR p.isActive = :isActive)
            ORDER BY p.pageOrder ASC
            """)
    Page<TutorialPage> searchForAdmin(
            @Param("isActive") Boolean isActive,
            Pageable pageable);
}
