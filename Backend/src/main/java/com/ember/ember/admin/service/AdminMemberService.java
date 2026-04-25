package com.ember.ember.admin.service;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.annotation.PiiAccess;
import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.admin.dto.member.*;
import com.ember.ember.admin.repository.AdminAccountRepository;
import com.ember.ember.auth.service.TokenService;
import com.ember.ember.diary.domain.UserActivityEvent;
import com.ember.ember.diary.repository.DiaryRepository;
import com.ember.ember.diary.repository.UserActivityEventRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.matching.repository.MatchingRepository;
import com.ember.ember.report.domain.SanctionHistory;
import com.ember.ember.report.repository.SanctionHistoryRepository;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 관리자 회원 관리 서비스 — 관리자 API 통합명세서 v2.1 §3.1~3.9 (일부).
 * 구현 범위: §3.1 / §3.2 / §3.3 / §3.4 / §3.5 / §3.7 / §3.9.
 * §3.6(회원별 일기), §3.8(활동 타임라인) 은 Phase A 2차 PR.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminMemberService {

    private final UserRepository userRepository;
    private final AdminAccountRepository adminAccountRepository;
    private final SanctionHistoryRepository sanctionHistoryRepository;
    private final DiaryRepository diaryRepository;
    private final MatchingRepository matchingRepository;
    private final UserActivityEventRepository userActivityEventRepository;
    private final TokenService tokenService;

    // ── §3.8 이상 패턴 탐지 임계값 ─────────────────────────────────────────────
    /** 1시간 내 3회 이상 신고 생성 → 이상 (spec §3.8 [Backend]) */
    private static final int REPORT_WINDOW_THRESHOLD = 3;
    private static final long REPORT_WINDOW_SECONDS = 3600L;
    /** 24시간 내 10명 이상 매칭 신청 → 이상 */
    private static final int MATCH_WINDOW_THRESHOLD = 10;
    private static final long MATCH_WINDOW_SECONDS = 86400L;
    /** 30초 이내 일기 반복 제출 → 이상 */
    private static final long DIARY_REPEAT_SECONDS = 30L;

    /** 이상 패턴 탐지 대상 이벤트 유형 — 슬라이딩 윈도우 입력 집합 */
    private static final List<String> ANOMALY_EVENT_TYPES = List.of(
            "REPORT_CREATED", "MATCH_REQUESTED", "DIARY_CREATED"
    );

    // ---------- §3.1 목록 ----------
    public Page<AdminMemberListItemResponse> list(String keyword,
                                                   User.UserStatus status,
                                                   User.Gender gender,
                                                   Pageable pageable) {
        String normalized = (keyword == null || keyword.isBlank()) ? null : keyword.trim();
        return userRepository.searchMembers(normalized, status, gender, pageable)
                .map(u -> AdminMemberListItemResponse.from(u, maskEmail(u.getEmail())));
    }

    // ---------- §3.2 상세 (VIEWER 마스킹) ----------
    public AdminMemberDetailResponse getDetailMasked(Long userId) {
        User user = loadUser(userId);
        return AdminMemberDetailResponse.from(user, maskEmail(user.getEmail()), true);
    }

    // ---------- §3.2 상세 (ADMIN+, 이메일 전체 + PII 감사 로그) ----------
    @Transactional
    @PiiAccess(accessType = "EMAIL_FULL_VIEW", targetUserIdParam = "userId")
    public AdminMemberDetailResponse getDetailWithFullEmail(Long userId) {
        User user = loadUser(userId);
        return AdminMemberDetailResponse.from(user, user.getEmail(), false);
    }

    // ---------- §3.3 7일 정지 ----------
    @Transactional
    @AdminAction(action = "USER_SUSPEND_7D", targetType = "USER", targetIdParam = "userId")
    public void suspendFor7Days(Long userId, String reason, CustomUserDetails admin) {
        User user = loadUser(userId);
        LocalDateTime now = LocalDateTime.now();
        User.UserStatus previous = user.getStatus();

        user.suspendFor7Days(reason, now);

        sanctionHistoryRepository.save(SanctionHistory.create(
                user, adminAccountRepository.getReferenceById(admin.getUserId()),
                SanctionHistory.SanctionType.SUSPEND_7D,
                reason, null, previous.name(), null,
                now, now.plusDays(7)));

        // 사용자 Refresh Token 삭제 — 즉시 로그아웃 유도
        tokenService.deleteRefreshToken(userId);
        // TODO(Phase B): FCM 알림 발송 연동
    }

    // ---------- §3.4 영구 정지 ----------
    @Transactional
    @AdminAction(action = "USER_BAN", targetType = "USER", targetIdParam = "userId")
    public void banPermanently(Long userId, String reason, CustomUserDetails admin) {
        User user = loadUser(userId);
        LocalDateTime now = LocalDateTime.now();
        User.UserStatus previous = user.getStatus();

        user.banPermanently(reason, now);

        sanctionHistoryRepository.save(SanctionHistory.create(
                user, adminAccountRepository.getReferenceById(admin.getUserId()),
                SanctionHistory.SanctionType.SUSPEND_PERMANENT,
                reason, null, previous.name(), null,
                now, null));

        tokenService.deleteRefreshToken(userId);
        // TODO(Phase B): FCM 알림, AccessToken 블랙리스트 등록은 후속 PR에서
    }

    // ---------- §3.5 제재 해제 ----------
    @Transactional
    @AdminAction(action = "USER_SANCTION_RELEASE", targetType = "USER", targetIdParam = "userId")
    public AdminMemberReleaseResponse releaseSanction(Long userId,
                                                       AdminMemberReleaseRequest request,
                                                       CustomUserDetails admin) {
        User user = loadUser(userId);
        User.UserStatus previous = user.getStatus();

        if (!isSanctioned(previous)) {
            throw new BusinessException(ErrorCode.ADM_USER_NOT_SANCTIONED);
        }

        // BANNED 해제는 SUPER_ADMIN 전용
        if (previous == User.UserStatus.BANNED && !isSuperAdmin(admin.getRole())) {
            throw new BusinessException(ErrorCode.ADM_BANNED_RELEASE_FORBIDDEN);
        }

        user.releaseSanction();
        LocalDateTime releasedAt = LocalDateTime.now();

        SanctionHistory history = sanctionHistoryRepository.save(SanctionHistory.create(
                user, adminAccountRepository.getReferenceById(admin.getUserId()),
                SanctionHistory.SanctionType.UNBLOCK,
                request.reasonDetail(), request.reasonCategory().name(), previous.name(), null,
                releasedAt, null));

        // 기존 제재로 인해 삭제된 RT 는 없어도 되지만, 새로 로그인 가능한 상태로 전환 완료.
        // TODO(Phase B): FCM 알림(제재 해제 안내)

        return new AdminMemberReleaseResponse(userId, previous, User.UserStatus.ACTIVE,
                                              releasedAt, history.getId());
    }

    // ---------- §3.6 회원별 일기 목록 ----------
    public Page<AdminMemberDiaryListItemResponse> getDiaryList(Long userId, Pageable pageable) {
        loadUser(userId);
        return diaryRepository.findByUserIdOrderByDateDesc(userId, pageable)
                .map(AdminMemberDiaryListItemResponse::from);
    }

    // ---------- §3.8 활동 타임라인 (이상 패턴 하이라이트) ----------
    public Page<AdminActivityTimelineItemResponse> getActivityTimeline(Long userId,
                                                                        int periodDays,
                                                                        String eventType,
                                                                        Pageable pageable) {
        loadUser(userId);
        int safePeriod = Math.max(1, Math.min(periodDays, 365));
        LocalDateTime from = LocalDateTime.now().minusDays(safePeriod);

        String typeFilter = (eventType == null || eventType.isBlank()) ? null : eventType.trim();

        Page<UserActivityEvent> page = userActivityEventRepository
                .findTimeline(userId, from, typeFilter, pageable);

        // 이상 패턴 판정은 페이지 외 전체 스코프 필요 → 기간 내 anomaly 유형만 모아 슬라이딩 윈도우 적용
        List<UserActivityEvent> scope = userActivityEventRepository
                .findAnomalyScope(userId, from, ANOMALY_EVENT_TYPES);
        Set<Long> anomalousIds = computeAnomalousEventIds(scope);

        return page.map(e -> AdminActivityTimelineItemResponse.from(e, anomalousIds.contains(e.getId())));
    }

    /**
     * 이상 패턴 탐지 알고리즘 (슬라이딩 윈도우).
     *
     * 입력: 대상 사용자의 {@link #ANOMALY_EVENT_TYPES} 이벤트 전체 (시간 오름차순).
     *
     * 규칙:
     *  1) REPORT_CREATED — 1시간 윈도우 내 연속 3건 이상이면 그 윈도우 내 모든 REPORT 이벤트를 이상으로 표시.
     *  2) MATCH_REQUESTED — 24시간 윈도우 내 연속 10건 이상이면 해당 윈도우 전체 이상.
     *  3) DIARY_CREATED — 직전 DIARY_CREATED 와 30초 이내면 양쪽 모두 이상.
     *
     * 시간 복잡도: 전체 n 에 대해 O(n) (각 타입별 투 포인터).
     * 공간: 이상 이벤트 id 집합.
     */
    private Set<Long> computeAnomalousEventIds(List<UserActivityEvent> scope) {
        Set<Long> anomalous = new HashSet<>();

        // 유형별 분리 (occurredAt 이미 ASC)
        List<UserActivityEvent> reports = filterByType(scope, "REPORT_CREATED");
        List<UserActivityEvent> matches = filterByType(scope, "MATCH_REQUESTED");
        List<UserActivityEvent> diaries = filterByType(scope, "DIARY_CREATED");

        flagSlidingWindowBursts(reports, REPORT_WINDOW_SECONDS, REPORT_WINDOW_THRESHOLD, anomalous);
        flagSlidingWindowBursts(matches, MATCH_WINDOW_SECONDS, MATCH_WINDOW_THRESHOLD, anomalous);
        flagConsecutivePairs(diaries, DIARY_REPEAT_SECONDS, anomalous);

        return anomalous;
    }

    private List<UserActivityEvent> filterByType(List<UserActivityEvent> events, String type) {
        return events.stream().filter(e -> type.equals(e.getEventType())).toList();
    }

    /**
     * 슬라이딩 윈도우: 임의 위치에서 windowSeconds 범위 내 이벤트 수가 threshold 이상이면
     * 그 윈도우 내 모든 이벤트를 이상으로 플래그.
     * 좌 포인터 left, 우 포인터 right 를 유지하며 window 가 threshold 를 넘는 순간
     * [left..right] 범위를 모두 마킹한다.
     */
    private void flagSlidingWindowBursts(List<UserActivityEvent> events,
                                          long windowSeconds,
                                          int threshold,
                                          Set<Long> out) {
        int n = events.size();
        if (n < threshold) return;
        int left = 0;
        for (int right = 0; right < n; right++) {
            LocalDateTime rightTime = events.get(right).getOccurredAt();
            // 윈도우 축소: right 시각과 left 시각 차이가 window 초 이하가 되도록
            while (left < right
                    && java.time.Duration.between(events.get(left).getOccurredAt(), rightTime).getSeconds() > windowSeconds) {
                left++;
            }
            int size = right - left + 1;
            if (size >= threshold) {
                for (int i = left; i <= right; i++) {
                    out.add(events.get(i).getId());
                }
            }
        }
    }

    /**
     * 연속 쌍 탐지: 직전 이벤트와 시간 차이가 gapSeconds 이하면 두 이벤트를 모두 이상으로 플래그.
     */
    private void flagConsecutivePairs(List<UserActivityEvent> events,
                                      long gapSeconds,
                                      Set<Long> out) {
        for (int i = 1; i < events.size(); i++) {
            UserActivityEvent prev = events.get(i - 1);
            UserActivityEvent curr = events.get(i);
            long diff = java.time.Duration.between(prev.getOccurredAt(), curr.getOccurredAt()).getSeconds();
            if (diff >= 0 && diff <= gapSeconds) {
                out.add(prev.getId());
                out.add(curr.getId());
            }
        }
    }

    // ---------- §3.7 제재 이력 ----------
    public List<AdminSanctionHistoryItemResponse> getSanctionHistory(Long userId) {
        // 존재 확인 (404 처리)
        loadUser(userId);
        return sanctionHistoryRepository.findAllByUserIdWithAdmin(userId).stream()
                .map(AdminSanctionHistoryItemResponse::from)
                .toList();
    }

    // ---------- §3.9 활동 요약 ----------
    public AdminMemberActivitySummaryResponse getActivitySummary(Long userId) {
        User user = loadUser(userId);
        long diaries = diaryRepository.countByUserId(userId);
        long matches = matchingRepository.countActiveExchangesByUserId(userId);
        // activeDays 는 Phase B 에서 `user_login_logs` 집계로 계산 예정 — 현재 0 반환.
        return new AdminMemberActivitySummaryResponse(diaries, matches, 0L, user.getLastLoginAt());
    }

    // ---------- 내부 유틸 ----------
    private User loadUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_USER_NOT_FOUND));
    }

    private boolean isSanctioned(User.UserStatus status) {
        return status == User.UserStatus.SUSPEND_7D
                || status == User.UserStatus.SUSPEND_30D
                || status == User.UserStatus.BANNED;
    }

    private boolean isSuperAdmin(String role) {
        return role != null && role.contains("SUPER_ADMIN");
    }

    /**
     * 이메일 마스킹: 로컬파트 앞 2자 공개 + 나머지는 '*'. 도메인은 그대로.
     * ab****@gmail.com 형식. 1~2자 로컬파트는 전체 별표 1개로 대체.
     */
    private String maskEmail(String email) {
        if (email == null || email.isBlank()) return email;
        int at = email.indexOf('@');
        if (at <= 0) return "*" + email;
        String local = email.substring(0, at);
        String domain = email.substring(at);
        if (local.length() <= 2) {
            return "*".repeat(local.length()) + domain;
        }
        return local.substring(0, 2) + "*".repeat(local.length() - 2) + domain;
    }
}
