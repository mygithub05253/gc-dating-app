package com.ember.ember.notification.repository;

import com.ember.ember.notification.domain.Notice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * 공지사항 Repository
 */
public interface NoticeRepository extends JpaRepository<Notice, Long> {

    /** 발행된 공지사항 목록 (고정 우선, 최신순) */
    @Query("""
            SELECT n FROM Notice n
            WHERE n.status = com.ember.ember.notification.domain.Notice$NoticeStatus.PUBLISHED
              AND n.deletedAt IS NULL
            ORDER BY n.isPinned DESC, n.publishedAt DESC
            """)
    List<Notice> findPublished();

    /** 공지사항 상세 (발행된 것만) */
    @Query("""
            SELECT n FROM Notice n
            WHERE n.id = :id
              AND n.status = com.ember.ember.notification.domain.Notice$NoticeStatus.PUBLISHED
              AND n.deletedAt IS NULL
            """)
    Optional<Notice> findPublishedById(@Param("id") Long id);

    /** 미읽음 공지 수 (특정 사용자가 읽지 않은 PUBLISHED 공지) */
    @Query("""
            SELECT COUNT(n) FROM Notice n
            WHERE n.status = com.ember.ember.notification.domain.Notice$NoticeStatus.PUBLISHED
              AND n.deletedAt IS NULL
              AND n.id NOT IN (
                  SELECT unr.notice.id FROM UserNoticeRead unr WHERE unr.user.id = :userId
              )
            """)
    int countUnreadByUserId(@Param("userId") Long userId);
}
