package com.ember.ember.notification.repository;

import com.ember.ember.notification.domain.Notice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

/**
 * 공지사항 Repository
 */
public interface NoticeRepository extends JpaRepository<Notice, Long> {

    /** 관리자 §11 공지사항 목록 — category/status/isPinned 필터. */
    @Query("""
            SELECT n FROM Notice n
            WHERE n.deletedAt IS NULL
              AND (:category IS NULL OR n.category = :category)
              AND (:status IS NULL OR n.status = :status)
              AND (:isPinned IS NULL OR n.isPinned = :isPinned)
            ORDER BY n.isPinned DESC, n.createdAt DESC
            """)
    Page<Notice> searchForAdmin(
            @Param("category") Notice.NoticeCategory category,
            @Param("status") Notice.NoticeStatus status,
            @Param("isPinned") Boolean isPinned,
            Pageable pageable);

    /** 고정 공지 개수 (삭제되지 않은 것만) */
    int countByIsPinnedTrueAndDeletedAtIsNull();

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
