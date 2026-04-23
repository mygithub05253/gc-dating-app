package com.ember.ember.content.repository;

import com.ember.ember.content.domain.ExampleDiary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExampleDiaryRepository extends JpaRepository<ExampleDiary, Long> {

    @Query("""
            SELECT e FROM ExampleDiary e
            WHERE (:category IS NULL OR e.category = :category)
              AND (:displayTarget IS NULL OR e.displayTarget = :displayTarget)
              AND (:isActive IS NULL OR e.isActive = :isActive)
            ORDER BY e.displayOrder ASC, e.id DESC
            """)
    Page<ExampleDiary> searchForAdmin(
            @Param("category") ExampleDiary.Category category,
            @Param("displayTarget") ExampleDiary.DisplayTarget displayTarget,
            @Param("isActive") Boolean isActive,
            Pageable pageable);
}
