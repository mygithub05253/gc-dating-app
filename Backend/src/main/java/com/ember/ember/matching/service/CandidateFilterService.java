package com.ember.ember.matching.service;

import com.ember.ember.user.domain.User;
import com.ember.ember.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 매칭 후보 사용자 필터링 서비스 (M4 초기 구현).
 *
 * 필터 조건:
 *   1. 이성 (gender 반전)
 *   2. 연령 ±5세 (birthDate 기준)
 *   3. 최근 활동 7일 이내 (lastLoginAt 기준)
 *   4. ACTIVE 상태
 *   5. 자기 자신 제외
 *   6. MatchingExclusion(차단/종료) 제외
 *
 * TODO(M5): 현재 교환일기 진행 중인 사용자 제외 (exchange_rooms ACTIVE 상태 기준)
 * TODO(M5): MatchingPass(패스) 이력 반영
 * TODO(M6): 지역 선호, 활동 점수 기반 가중 필터링 추가
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CandidateFilterService {

    private static final int CANDIDATE_LIMIT = 50;
    private static final int AGE_RANGE_YEARS = 5;
    private static final int ACTIVE_DAYS_THRESHOLD = 7;

    private final UserRepository userRepository;

    /**
     * 기준 사용자에 대한 매칭 후보 ID 목록을 반환한다.
     *
     * @param currentUser 기준 사용자 엔티티 (성별, 생년월일 사용)
     * @return 후보 사용자 PK 목록 (최대 50개)
     */
    @Transactional(readOnly = true)
    public List<Long> findCandidates(User currentUser) {
        // 이성 조건: 기준 사용자 성별 반전
        User.Gender oppositeGender = (currentUser.getGender() == User.Gender.MALE)
                ? User.Gender.FEMALE
                : User.Gender.MALE;

        // 연령 범위 계산 (±5세 birthDate 기준)
        // 기준 사용자 생년 ± 5년
        LocalDate baseDate = currentUser.getBirthDate();
        LocalDate minBirthDate = baseDate.minusYears(AGE_RANGE_YEARS);   // 더 나이 많은 쪽
        LocalDate maxBirthDate = baseDate.plusYears(AGE_RANGE_YEARS);    // 더 어린 쪽

        // 최근 활동 7일 이내 기준 시각
        LocalDateTime activeThreshold = LocalDateTime.now().minusDays(ACTIVE_DAYS_THRESHOLD);

        List<Long> candidates = userRepository.findCandidateUserIds(
                currentUser.getId(),
                oppositeGender,
                minBirthDate,
                maxBirthDate,
                activeThreshold,
                CANDIDATE_LIMIT
        );

        log.debug("[CandidateFilter] userId={}, 후보 {}명 필터링 완료 (이성={}, 연령±{}세, 활동{}일내)",
                currentUser.getId(), candidates.size(), oppositeGender, AGE_RANGE_YEARS, ACTIVE_DAYS_THRESHOLD);

        return candidates;
    }
}
