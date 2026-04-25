package com.ember.ember.admin.repository.socialauth;

import com.ember.ember.admin.domain.socialauth.SocialLoginErrorLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SocialLoginErrorLogRepository extends JpaRepository<SocialLoginErrorLog, Long> {

    /** 시간 윈도우 내 제공자별 총 오류 건수. */
    long countByProviderAndOccurredAtAfter(String provider, LocalDateTime threshold);

    /** 영향 받은 고유 사용자 수 (userId NOT NULL 한정). */
    @Query("SELECT COUNT(DISTINCT l.userId) FROM SocialLoginErrorLog l " +
           "WHERE l.provider = :provider " +
           "  AND l.userId IS NOT NULL " +
           "  AND l.occurredAt >= :threshold")
    long countDistinctUsers(@Param("provider") String provider,
                            @Param("threshold") LocalDateTime threshold);

    /** 오류 유형 분포 — [errorType, count]. */
    @Query("SELECT l.errorType, COUNT(l) FROM SocialLoginErrorLog l " +
           "WHERE l.provider = :provider AND l.occurredAt >= :threshold " +
           "GROUP BY l.errorType")
    List<Object[]> countGroupByErrorType(@Param("provider") String provider,
                                         @Param("threshold") LocalDateTime threshold);

    /** 해결 상태 분포 — [resolutionStatus, count]. */
    @Query("SELECT l.resolutionStatus, COUNT(l) FROM SocialLoginErrorLog l " +
           "WHERE l.provider = :provider AND l.occurredAt >= :threshold " +
           "GROUP BY l.resolutionStatus")
    List<Object[]> countGroupByResolution(@Param("provider") String provider,
                                          @Param("threshold") LocalDateTime threshold);

    /** 오류 이력 — 페이지네이션 조회 (필터: provider/기간/오류유형). */
    @Query(value = "SELECT l FROM SocialLoginErrorLog l " +
                   "WHERE (:provider IS NULL OR l.provider = :provider) " +
                   "  AND (:errorType IS NULL OR l.errorType = :errorType) " +
                   "  AND l.occurredAt >= :startDate " +
                   "  AND l.occurredAt < :endDate " +
                   "ORDER BY l.occurredAt DESC",
            countQuery = "SELECT COUNT(l) FROM SocialLoginErrorLog l " +
                         "WHERE (:provider IS NULL OR l.provider = :provider) " +
                         "  AND (:errorType IS NULL OR l.errorType = :errorType) " +
                         "  AND l.occurredAt >= :startDate " +
                         "  AND l.occurredAt < :endDate")
    Page<SocialLoginErrorLog> searchHistory(@Param("provider") String provider,
                                            @Param("errorType") SocialLoginErrorLog.ErrorType errorType,
                                            @Param("startDate") LocalDateTime startDate,
                                            @Param("endDate") LocalDateTime endDate,
                                            Pageable pageable);
}
