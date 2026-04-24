package com.ember.ember.matching.service;

import com.ember.ember.exchange.repository.ExchangeRoomRepository;
import com.ember.ember.matching.repository.MatchingPassRepository;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 매칭 후보 사용자 필터링 서비스.
 *
 * 필터 조건:
 *   1. 이성 (gender 반전)
 *   2. 연령 ±5세 (birthDate 기준)
 *   3. 최근 활동 7일 이내 (lastLoginAt 기준)
 *   4. ACTIVE 상태
 *   5. 자기 자신 제외
 *   6. MatchingExclusion(차단/종료) 제외
 *   7. 교환일기 ACTIVE 3건 이상인 유저 제외 (명세서 §5.4 최대 3건)
 *   8. MatchingPass(7일 이내 skip) 대상 유저 제외
 *
 * TODO(M6): 지역 선호, 활동 점수 기반 가중 필터링 추가
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CandidateFilterService {

    private static final int CANDIDATE_LIMIT = 50;
    private static final int AGE_RANGE_YEARS = 5;
    private static final int ACTIVE_DAYS_THRESHOLD = 7;
    private static final int SKIP_EXCLUSION_DAYS = 7;

    private final UserRepository userRepository;
    private final ExchangeRoomRepository exchangeRoomRepository;
    private final MatchingPassRepository matchingPassRepository;

    /**
     * 기준 사용자에 대한 매칭 후보 ID 목록을 반환한다.
     *
     * @param currentUser 기준 사용자 엔티티 (성별, 생년월일 사용)
     * @return 후보 사용자 PK 목록 (최대 50개)
     */
    @Transactional(readOnly = true)
    public List<Long> findCandidates(User currentUser) {
        User.Gender oppositeGender = (currentUser.getGender() == User.Gender.MALE)
                ? User.Gender.FEMALE
                : User.Gender.MALE;

        LocalDate baseDate = currentUser.getBirthDate();
        LocalDate minBirthDate = baseDate.minusYears(AGE_RANGE_YEARS);
        LocalDate maxBirthDate = baseDate.plusYears(AGE_RANGE_YEARS);
        LocalDateTime activeThreshold = LocalDateTime.now().minusDays(ACTIVE_DAYS_THRESHOLD);

        // 1차: DB 쿼리 기본 필터 (이성/연령/활동/차단)
        List<Long> candidates = userRepository.findCandidateUserIds(
                currentUser.getId(),
                oppositeGender,
                minBirthDate,
                maxBirthDate,
                activeThreshold,
                CANDIDATE_LIMIT
        );

        if (candidates.isEmpty()) {
            return candidates;
        }

        // 2차: 교환일기 ACTIVE 3건 이상인 유저 제외
        Set<Long> excludeIds = new HashSet<>(
                exchangeRoomRepository.findUserIdsWithMaxActiveRooms(candidates));

        // 3차: MatchingPass 7일 이내 skip한 유저 제외
        LocalDateTime skipSince = LocalDateTime.now().minusDays(SKIP_EXCLUSION_DAYS);
        excludeIds.addAll(matchingPassRepository.findSkippedUserIdsSince(
                currentUser.getId(), skipSince));

        if (!excludeIds.isEmpty()) {
            candidates = candidates.stream()
                    .filter(id -> !excludeIds.contains(id))
                    .toList();
        }

        log.debug("[CandidateFilter] userId={}, 최종 후보 {}명 (제외 {}명)",
                currentUser.getId(), candidates.size(), excludeIds.size());

        return candidates;
    }
}
