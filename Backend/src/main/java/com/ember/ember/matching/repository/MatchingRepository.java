package com.ember.ember.matching.repository;

import com.ember.ember.matching.domain.Matching;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MatchingRepository extends JpaRepository<Matching, Long> {

    /** 나에게 온 PENDING 매칭 요청 목록 (최신순) */
    @Query("SELECT m FROM Matching m JOIN FETCH m.fromUser JOIN FETCH m.diary WHERE m.toUser.id = :toUserId AND m.status = :status ORDER BY m.id DESC")
    List<Matching> findReceivedRequests(@Param("toUserId") Long toUserId, @Param("status") Matching.MatchingStatus status);

    /** 동일 상대방에 대한 PENDING 신청 존재 여부 */
    boolean existsByFromUserIdAndToUserIdAndStatus(Long fromUserId, Long toUserId, Matching.MatchingStatus status);

    /** 역방향 PENDING 신청 조회 (양방향 매칭 감지용) */
    Optional<Matching> findByFromUserIdAndToUserIdAndStatus(Long fromUserId, Long toUserId, Matching.MatchingStatus status);

    /** 현재 진행 중인 교환일기 수 (MATCHED 상태) */
    @Query("""
            SELECT COUNT(m) FROM Matching m
            WHERE (m.fromUser.id = :userId OR m.toUser.id = :userId)
              AND m.status = com.ember.ember.matching.domain.Matching$MatchingStatus.MATCHED
            """)
    long countActiveExchangesByUserId(@Param("userId") Long userId);
}
