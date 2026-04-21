package com.ember.ember.notification.repository;

import com.ember.ember.notification.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 알림 Repository
 */
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /** 사용자의 알림 목록 (최신순, 30일 이내) */
    @Query("""
            SELECT n FROM Notification n
            WHERE n.user.id = :userId
              AND n.sentAt >= :since
            ORDER BY n.sentAt DESC
            """)
    List<Notification> findByUserId(@Param("userId") Long userId, @Param("since") LocalDateTime since);

    /** 특정 알림 조회 (소유권 검증용) */
    Optional<Notification> findByIdAndUserId(Long id, Long userId);

    /** 미읽음 알림 수 */
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.user.id = :userId AND n.isRead = false")
    int countUnread(@Param("userId") Long userId);

    /** 전체 미읽음 알림 읽음 처리 (단일 쿼리) */
    @Modifying
    @Query("""
            UPDATE Notification n
            SET n.isRead = true, n.readAt = :now
            WHERE n.user.id = :userId AND n.isRead = false
            """)
    int markAllAsRead(@Param("userId") Long userId, @Param("now") LocalDateTime now);
}
