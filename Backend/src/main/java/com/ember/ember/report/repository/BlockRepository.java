package com.ember.ember.report.repository;

import com.ember.ember.report.domain.Block;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * 차단 Repository
 */
public interface BlockRepository extends JpaRepository<Block, Long> {

    /** 차단 존재 여부 확인 (ACTIVE 상태만) */
    boolean existsByBlockerUserIdAndBlockedUserIdAndStatus(
            Long blockerUserId, Long blockedUserId, Block.BlockStatus status);

    /** 차단 레코드 조회 (ACTIVE 상태) */
    Optional<Block> findByBlockerUserIdAndBlockedUserIdAndStatus(
            Long blockerUserId, Long blockedUserId, Block.BlockStatus status);

    /** 차단 목록 조회 (커서 기반 페이징, ACTIVE 상태) */
    @Query("""
            SELECT b FROM Block b
            JOIN FETCH b.blockedUser
            WHERE b.blockerUser.id = :blockerUserId
              AND b.status = com.ember.ember.report.domain.Block$BlockStatus.ACTIVE
              AND (:cursor IS NULL OR b.id < :cursor)
            ORDER BY b.id DESC
            LIMIT :size
            """)
    List<Block> findBlockList(
            @Param("blockerUserId") Long blockerUserId,
            @Param("cursor") Long cursor,
            @Param("size") int size
    );

    /** 양방향 차단 확인 (탐색/매칭 제외 필터용) */
    @Query("""
            SELECT COUNT(b) > 0 FROM Block b
            WHERE b.status = com.ember.ember.report.domain.Block$BlockStatus.ACTIVE
              AND ((b.blockerUser.id = :userA AND b.blockedUser.id = :userB)
                OR (b.blockerUser.id = :userB AND b.blockedUser.id = :userA))
            """)
    boolean existsBlockBetween(@Param("userA") Long userA, @Param("userB") Long userB);
}
