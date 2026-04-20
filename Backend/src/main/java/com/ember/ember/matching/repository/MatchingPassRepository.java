package com.ember.ember.matching.repository;

import com.ember.ember.matching.domain.MatchingPass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface MatchingPassRepository extends JpaRepository<MatchingPass, Long> {

    /** 특정 사용자가 7일 이내에 skip한 대상 사용자 ID 목록 */
    @Query("""
            SELECT mp.targetUser.id FROM MatchingPass mp
            WHERE mp.user.id = :userId AND mp.passedAt >= :since
            """)
    List<Long> findSkippedUserIdsSince(@Param("userId") Long userId, @Param("since") LocalDateTime since);
}
