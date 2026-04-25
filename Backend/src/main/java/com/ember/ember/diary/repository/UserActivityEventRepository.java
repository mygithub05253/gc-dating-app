package com.ember.ember.diary.repository;

import com.ember.ember.diary.domain.UserActivityEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 사용자 활동 이벤트 Repository
 *
 * §3.8 활동 타임라인 조회, §4 의심 계정 탐지 집계 등에서 사용.
 */
public interface UserActivityEventRepository extends JpaRepository<UserActivityEvent, Long> {

    /**
     * 활동 타임라인 조회 — §3.8.
     * userId 의 최근 {from} 이후 이벤트를 {eventType} 필터(선택)로 조회, 시간 역순 페이징.
     */
    @Query("""
            SELECT e FROM UserActivityEvent e
             WHERE e.user.id = :userId
               AND e.occurredAt >= :from
               AND (CAST(:eventType AS string) IS NULL OR e.eventType = :eventType)
             ORDER BY e.occurredAt DESC
            """)
    Page<UserActivityEvent> findTimeline(@Param("userId") Long userId,
                                          @Param("from") LocalDateTime from,
                                          @Param("eventType") String eventType,
                                          Pageable pageable);

    /**
     * 이상 패턴 탐지용 이벤트 조회.
     * {from} 이후 {eventTypes} 에 해당하는 모든 이벤트를 시간 오름차순으로 반환.
     * 슬라이딩 윈도우 알고리즘의 입력이므로 페이지네이션 없이 전체 수집.
     */
    @Query("""
            SELECT e FROM UserActivityEvent e
             WHERE e.user.id = :userId
               AND e.occurredAt >= :from
               AND e.eventType IN :eventTypes
             ORDER BY e.occurredAt ASC
            """)
    List<UserActivityEvent> findAnomalyScope(@Param("userId") Long userId,
                                              @Param("from") LocalDateTime from,
                                              @Param("eventTypes") List<String> eventTypes);
}
