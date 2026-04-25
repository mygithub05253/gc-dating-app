package com.ember.ember.admin.repository.event;

import com.ember.ember.admin.domain.event.EventParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface EventParticipantRepository extends JpaRepository<EventParticipant, Long> {

    long countByEventId(Long eventId);

    @Query("""
            SELECT CAST(ep.participatedAt AS date), COUNT(ep)
            FROM EventParticipant ep
            WHERE ep.eventId = :eventId
            GROUP BY CAST(ep.participatedAt AS date)
            ORDER BY CAST(ep.participatedAt AS date)
            """)
    List<Object[]> countDailyParticipation(@Param("eventId") Long eventId);

    @Query("""
            SELECT COUNT(DISTINCT ep.userId)
            FROM EventParticipant ep
            WHERE ep.eventId = :eventId
              AND ep.participatedAt >= :since
            """)
    long countNewUserParticipants(@Param("eventId") Long eventId, @Param("since") LocalDateTime since);
}
