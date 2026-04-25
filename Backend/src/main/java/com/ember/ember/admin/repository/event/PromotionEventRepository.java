package com.ember.ember.admin.repository.event;

import com.ember.ember.admin.domain.event.PromotionEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PromotionEventRepository extends JpaRepository<PromotionEvent, Long> {

    @Query("""
            SELECT e FROM PromotionEvent e
            WHERE (:type IS NULL OR e.type = :type)
              AND (:status IS NULL OR e.status = :status)
              AND (:target IS NULL OR e.target = :target)
            ORDER BY e.createdAt DESC
            """)
    Page<PromotionEvent> findByFilters(
            @Param("type") PromotionEvent.EventType type,
            @Param("status") PromotionEvent.EventStatus status,
            @Param("target") PromotionEvent.EventTarget target,
            Pageable pageable);
}
