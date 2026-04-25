package com.ember.ember.notification.repository;

import com.ember.ember.notification.domain.Banner;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 배너 Repository
 */
public interface BannerRepository extends JpaRepository<Banner, Long> {

    /** 현재 활성화된 배너 (최대 5개, 우선순위순) */
    @Query("""
            SELECT b FROM Banner b
            WHERE b.isActive = true
              AND b.startAt <= :now AND b.endAt >= :now
            ORDER BY b.priority DESC
            LIMIT 5
            """)
    List<Banner> findActiveBanners(@Param("now") LocalDateTime now);

    /** 관리자 §12 배너 목록 — isActive 필터. */
    @Query("""
            SELECT b FROM Banner b
            WHERE (:isActive IS NULL OR b.isActive = :isActive)
            ORDER BY b.priority DESC, b.startAt DESC
            """)
    Page<Banner> searchForAdmin(
            @Param("isActive") Boolean isActive,
            Pageable pageable);
}
