package com.ember.ember.user.repository;

import com.ember.ember.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 사용자 Repository - main + feature 메서드 합산
 */
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByNickname(String nickname);

    boolean existsByNickname(String nickname);

    /**
     * 매칭 후보 필터 쿼리 (M4 초기 구현).
     *
     * 필터 조건:
     *   1. 이성 (gender != 기준 사용자 gender)
     *   2. 연령 ±5세 (birthDate 기반: 만 나이 ≈ birthDate 비교)
     *   3. 최근 활동 7일 이내 (lastLoginAt 기준 — lastActiveAt 컬럼 없으므로 대체)
     *   4. ACTIVE 상태 사용자만
     *   5. 자기 자신 제외
     *   6. 매칭 제외 목록(MatchingExclusion) 제외
     *
     * TODO(M5): 이미 매칭 진행 중인 사용자 제외 (exchange_rooms 테이블 기준)
     * TODO(M5): MatchingPass(패스한 사용자) 제외 로직 추가
     * TODO(M6): 후보 필터링 정교화 (지역 선호, 활동 점수 기반 우선순위)
     */
    @Query("""
            SELECT u.id FROM User u
            WHERE u.id != :excludeUserId
              AND u.gender != :gender
              AND u.birthDate >= :minBirthDate
              AND u.birthDate <= :maxBirthDate
              AND (u.lastLoginAt IS NOT NULL AND u.lastLoginAt >= :activeThreshold)
              AND u.status = com.ember.ember.user.domain.User$UserStatus.ACTIVE
              AND u.id NOT IN (
                  SELECT me.excludedUser.id FROM MatchingExclusion me
                  WHERE me.user.id = :excludeUserId
              )
            ORDER BY u.lastLoginAt DESC
            LIMIT :limit
            """)
    List<Long> findCandidateUserIds(
            @Param("excludeUserId") Long excludeUserId,
            @Param("gender") User.Gender gender,
            @Param("minBirthDate") LocalDate minBirthDate,
            @Param("maxBirthDate") LocalDate maxBirthDate,
            @Param("activeThreshold") LocalDateTime activeThreshold,
            @Param("limit") int limit
    );
}
