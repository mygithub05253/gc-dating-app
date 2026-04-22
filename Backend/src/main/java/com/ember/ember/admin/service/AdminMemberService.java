package com.ember.ember.admin.service;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.annotation.PiiAccess;
import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.admin.dto.member.*;
import com.ember.ember.admin.repository.AdminAccountRepository;
import com.ember.ember.auth.service.TokenService;
import com.ember.ember.diary.repository.DiaryRepository;
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
import java.util.List;

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
    private final TokenService tokenService;

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
