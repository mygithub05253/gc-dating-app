package com.ember.ember.chat.repository;

import com.ember.ember.chat.domain.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * 채팅방 Repository
 */
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    /** roomUuid로 조회 */
    Optional<ChatRoom> findByRoomUuid(UUID roomUuid);

    /** 교환방 ID로 조회 */
    Optional<ChatRoom> findByExchangeRoomId(Long exchangeRoomId);

    /** 참여 중인 채팅방 목록 (종료 제외) */
    @Query("SELECT cr FROM ChatRoom cr WHERE (cr.userA.id = :userId OR cr.userB.id = :userId) " +
           "AND cr.status NOT IN ('TERMINATED') ORDER BY cr.modifiedAt DESC")
    List<ChatRoom> findByParticipant(@Param("userId") Long userId);

    /** 히스토리 조회 (종료된 채팅방, 커서 기반 페이징) */
    @Query("""
            SELECT cr FROM ChatRoom cr
            JOIN FETCH cr.userA JOIN FETCH cr.userB
            WHERE (cr.userA.id = :userId OR cr.userB.id = :userId)
              AND cr.status IN ('CHAT_LEFT', 'TERMINATED')
              AND (:cursor IS NULL OR cr.id < :cursor)
            ORDER BY cr.modifiedAt DESC
            LIMIT :size
            """)
    List<ChatRoom> findHistoryByParticipant(
            @Param("userId") Long userId, @Param("cursor") Long cursor, @Param("size") int size);
}
