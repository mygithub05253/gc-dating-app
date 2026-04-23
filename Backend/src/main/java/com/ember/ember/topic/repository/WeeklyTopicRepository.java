package com.ember.ember.topic.repository;

import com.ember.ember.topic.domain.WeeklyTopic;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface WeeklyTopicRepository extends JpaRepository<WeeklyTopic, Long> {

    /** 특정 주 시작일의 주제 조회 (사용자 앱용). */
    Optional<WeeklyTopic> findByWeekStartDateAndIsActiveTrue(LocalDate weekStartDate);

    /** 관리자 §6.4 목록 — category/isActive 필터. */
    @Query("""
            SELECT t FROM WeeklyTopic t
            WHERE (:category IS NULL OR t.category = :category)
              AND (:isActive IS NULL OR t.isActive = :isActive)
            """)
    Page<WeeklyTopic> searchForAdmin(
            @Param("category") String category,
            @Param("isActive") Boolean isActive,
            Pageable pageable);

    boolean existsByWeekStartDate(LocalDate weekStartDate);
}
