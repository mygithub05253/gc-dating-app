package com.ember.ember.report.repository;

import com.ember.ember.report.domain.SuspiciousAccount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * 의심 계정 Repository — 관리자 API 통합명세서 v2.1 §4.
 */
public interface SuspiciousAccountRepository extends JpaRepository<SuspiciousAccount, Long> {

    /**
     * §4.1 목록 조회.
     * 필터: status / suspicionType / keyword (닉네임·이메일 부분일치).
     * 정렬: risk_score DESC (기본), 동점은 detected_at DESC.
     * user 프록시 JOIN FETCH 로 닉네임/이메일 접근 시 N+1 회피.
     */
    @Query(value = """
            SELECT s FROM SuspiciousAccount s
              JOIN FETCH s.user u
             WHERE (:status IS NULL OR s.status = :status)
               AND (:suspicionType IS NULL OR s.suspicionType = :suspicionType)
               AND (:keyword IS NULL
                    OR LOWER(u.nickname) LIKE LOWER(CONCAT('%', :keyword, '%')))
             ORDER BY s.riskScore DESC, s.detectedAt DESC
            """,
            countQuery = """
            SELECT COUNT(s) FROM SuspiciousAccount s
             WHERE (:status IS NULL OR s.status = :status)
               AND (:suspicionType IS NULL OR s.suspicionType = :suspicionType)
               AND (:keyword IS NULL
                    OR LOWER(s.user.nickname) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<SuspiciousAccount> searchSuspicious(@Param("status") SuspiciousAccount.ReviewStatus status,
                                             @Param("suspicionType") SuspiciousAccount.SuspicionType suspicionType,
                                             @Param("keyword") String keyword,
                                             Pageable pageable);

    /**
     * §4.2 상세 조회 — user + reviewedBy 프록시를 한번에 끌어온다.
     */
    @Query("""
            SELECT s FROM SuspiciousAccount s
              JOIN FETCH s.user u
              LEFT JOIN FETCH s.reviewedBy
             WHERE s.id = :id
            """)
    Optional<SuspiciousAccount> findByIdWithUser(@Param("id") Long id);

    /**
     * §4.2 관련 계정 후보 — 동일 suspicion_type 의 최근 10건 (자기 자신 제외).
     * 실제 관련성 분석(IP/디바이스/행동 유사도)은 탐지 배치 구축 시 확장.
     */
    @Query("""
            SELECT s FROM SuspiciousAccount s
              JOIN FETCH s.user u
             WHERE s.suspicionType = :suspicionType
               AND s.id <> :excludeId
             ORDER BY s.detectedAt DESC
            """)
    List<SuspiciousAccount> findRelatedBySuspicionType(@Param("suspicionType") SuspiciousAccount.SuspicionType suspicionType,
                                                       @Param("excludeId") Long excludeId,
                                                       Pageable pageable);
}
