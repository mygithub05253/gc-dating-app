package com.ember.ember.report.repository;

import com.ember.ember.report.domain.ContactDetection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ContactDetectionRepository extends JpaRepository<ContactDetection, Long> {

    @Query("""
            SELECT d FROM ContactDetection d
            LEFT JOIN FETCH d.user u
            LEFT JOIN FETCH d.reviewedBy r
            WHERE (:status IS NULL OR d.status = :status)
              AND (:patternType IS NULL OR d.patternType = :patternType)
              AND (CAST(:since AS timestamp) IS NULL OR d.detectedAt >= :since)
            ORDER BY d.detectedAt DESC
            """)
    Page<ContactDetection> searchForAdmin(
            @Param("status") ContactDetection.Status status,
            @Param("patternType") ContactDetection.PatternType patternType,
            @Param("since") LocalDateTime since,
            Pageable pageable);

    /** 패턴 타입별 카운트 (통계 위젯용). */
    @Query("""
            SELECT d.patternType, COUNT(d) FROM ContactDetection d
            WHERE (CAST(:since AS timestamp) IS NULL OR d.detectedAt >= :since)
            GROUP BY d.patternType
            """)
    List<Object[]> countByPatternType(@Param("since") LocalDateTime since);
}
