package com.ember.ember.admin.repository.report;

import com.ember.ember.admin.domain.report.UserReportRestriction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface UserReportRestrictionRepository extends JpaRepository<UserReportRestriction, Long> {

    /** 해당 사용자의 현재 활성 제한 조회 */
    @Query("SELECT r FROM UserReportRestriction r WHERE r.userId = :userId AND r.restrictedUntil > :now")
    Optional<UserReportRestriction> findActiveByUserId(@Param("userId") Long userId,
                                                        @Param("now") LocalDateTime now);
}
