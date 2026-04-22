package com.ember.ember.admin.service;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.admin.domain.AdminLoginLog;
import com.ember.ember.admin.domain.AdminPasswordChangeLog;
import com.ember.ember.admin.dto.*;
import com.ember.ember.admin.repository.AdminAccountRepository;
import com.ember.ember.admin.repository.AdminLoginLogRepository;
import com.ember.ember.admin.repository.AdminPasswordChangeLogRepository;
import com.ember.ember.auth.service.TokenService;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.global.security.jwt.JwtProperties;
import com.ember.ember.global.security.jwt.JwtTokenProvider;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 관리자 인증 서비스
 * 구현 범위: 관리자 API 통합명세서 v2.1 §1.1~1.5 (로그인/토큰갱신/로그아웃/비밀번호변경/내정보)
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminAuthService {

    // 명세서 §1.1: 로그인 실패 5회 이상 시 15분 차단
    private static final long MAX_LOGIN_FAIL = 5L;
    // 명세서 §1.4: 하루 5회 초과 비밀번호 변경 시도 차단
    private static final long MAX_PWD_CHANGE_PER_DAY = 5L;
    private static final int USER_AGENT_MAX_LENGTH = 500;

    private final AdminAccountRepository adminAccountRepository;
    private final AdminLoginLogRepository adminLoginLogRepository;
    private final AdminPasswordChangeLogRepository adminPasswordChangeLogRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;
    private final TokenService tokenService;
    private final PasswordEncoder passwordEncoder;

    /** 관리자 로그인 (§1.1) — BCrypt 검증, 5회 실패 15분 차단, admin_login_logs 기록 */
    @Transactional
    public AdminTokenResponse login(AdminLoginRequest request, HttpServletRequest httpRequest) {
        String email = request.email();
        String ip = extractIp(httpRequest);
        String userAgent = truncate(httpRequest.getHeader("User-Agent"), USER_AGENT_MAX_LENGTH);

        // 1. 실패 카운터 선검사 (A020) — 계정 유무와 무관하게 먼저 차단
        if (tokenService.getLoginFailCount(email) >= MAX_LOGIN_FAIL) {
            throw new BusinessException(ErrorCode.ADMIN_LOGIN_LIMIT);
        }

        // 2. 계정 조회 (A003) — 보안상 "이메일 또는 비밀번호 불일치" 통일 메시지는 프런트에서 표기
        AdminAccount admin = adminAccountRepository.findByEmailAndDeletedAtIsNull(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        // 3. 계정 상태 검사 (A021 INACTIVE, A022 SUSPENDED, A003 DELETED)
        switch (admin.getStatus()) {
            case INACTIVE -> throw new BusinessException(ErrorCode.ADMIN_ACCOUNT_INACTIVE);
            case SUSPENDED -> throw new BusinessException(ErrorCode.ADMIN_ACCOUNT_SUSPENDED);
            case DELETED -> throw new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND);
            default -> { /* ACTIVE: 통과 */ }
        }

        // 4. BCrypt 비밀번호 비교 (A004) — 불일치 시 실패 카운터 증가 + 실패 로그
        if (!passwordEncoder.matches(request.password(), admin.getPasswordHash())) {
            tokenService.incrementLoginFailCount(email);
            adminLoginLogRepository.save(AdminLoginLog.of(admin, "LOGIN", false, ip, userAgent));
            throw new BusinessException(ErrorCode.PASSWORD_MISMATCH);
        }

        // 5. 로그인 성공 처리
        tokenService.resetLoginFailCount(email);
        admin.updateLastLoginAt(LocalDateTime.now());

        String accessToken = jwtTokenProvider.createAdminAccessToken(
                admin.getId(), admin.getEmail(), admin.getRole().name());
        String refreshToken = jwtTokenProvider.createAdminRefreshToken(admin.getId());

        tokenService.saveAdminRefreshToken(admin.getId(), refreshToken, jwtProperties.getRefreshExpiration());
        adminLoginLogRepository.save(AdminLoginLog.of(admin, "LOGIN", true, ip, userAgent));

        return new AdminTokenResponse(accessToken, refreshToken, admin.getRole(), admin.getId(), admin.getEmail());
    }

    /** 관리자 토큰 갱신 (§1.2) — RT 서명/만료/Redis 일치 검증 후 새 AT 발급 */
    @Transactional
    public AdminAccessTokenResponse refresh(AdminRefreshRequest request) {
        String rt = request.refreshToken();

        // 1. 서명·만료 검증 (A005)
        if (!jwtTokenProvider.validateToken(rt)) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_MISMATCH);
        }

        // 2. tokenType 검증 — 관리자 RT만 허용
        if (!"ADMIN".equals(jwtTokenProvider.getTokenTypeFromToken(rt))) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_MISMATCH);
        }

        // 3. type 클레임이 "refresh"인지 확인 (C001)
        if (!"refresh".equals(jwtTokenProvider.getTypeFromToken(rt))) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }

        Long adminId = jwtTokenProvider.getUserIdFromToken(rt);

        // 4. Redis RT 일치 비교 — 불일치는 탈취 의심 → 저장된 RT 즉시 삭제 (A005)
        String savedRt = tokenService.getAdminRefreshToken(adminId);
        if (savedRt == null || !savedRt.equals(rt)) {
            tokenService.deleteAdminRefreshToken(adminId);
            log.warn("관리자 RT 불일치 또는 탈취 의심: adminId={}", adminId);
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_MISMATCH);
        }

        // 5. 계정 상태 확인
        AdminAccount admin = adminAccountRepository.findById(adminId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));
        switch (admin.getStatus()) {
            case INACTIVE -> throw new BusinessException(ErrorCode.ADMIN_ACCOUNT_INACTIVE);
            case SUSPENDED -> throw new BusinessException(ErrorCode.ADMIN_ACCOUNT_SUSPENDED);
            case DELETED -> throw new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND);
            default -> { /* ACTIVE: 통과 */ }
        }

        // 6. 새 AT 발급 (RT는 그대로 유지 — 명세서 §1.2는 AT만 재발급)
        String newAccessToken = jwtTokenProvider.createAdminAccessToken(
                admin.getId(), admin.getEmail(), admin.getRole().name());
        return new AdminAccessTokenResponse(newAccessToken);
    }

    /** 관리자 로그아웃 (§1.3) — AT 블랙리스트 등록 + RT 삭제. 만료된 AT도 허용 */
    @Transactional
    public void logout(String accessToken, HttpServletRequest httpRequest) {
        if (accessToken == null) {
            return;
        }

        Long adminId;
        try {
            adminId = jwtTokenProvider.getAdminIdFromTokenAllowExpired(accessToken);
        } catch (Exception e) {
            log.warn("관리자 로그아웃: 토큰에서 adminId 추출 실패 - {}", e.getMessage());
            return;
        }

        // AT 블랙리스트 등록 — 만료된 AT라면 남은 만료시간이 음수이므로 자동 skip
        try {
            long remaining = jwtTokenProvider.getRemainingExpiration(accessToken);
            if (remaining > 0) {
                tokenService.addToBlacklist(accessToken, remaining);
            }
        } catch (Exception ignored) {
            // 만료된 토큰의 경우 getRemainingExpiration이 실패할 수 있음 — Best Effort
        }

        // RT 삭제 (Best Effort)
        tokenService.deleteAdminRefreshToken(adminId);

        // 감사 로그 기록 (계정이 있을 때만)
        adminAccountRepository.findById(adminId).ifPresent(admin -> {
            String ip = extractIp(httpRequest);
            String userAgent = truncate(httpRequest.getHeader("User-Agent"), USER_AGENT_MAX_LENGTH);
            adminLoginLogRepository.save(AdminLoginLog.of(admin, "LOGOUT", true, ip, userAgent));
        });
    }

    /** 관리자 비밀번호 변경 (§1.4) — 강도 검증 + 일일 5회 제한 + 이력 기록 */
    @Transactional
    public AdminPasswordChangeResponse changePassword(Long adminId,
                                                      AdminPasswordChangeRequest request,
                                                      HttpServletRequest httpRequest) {
        AdminAccount admin = adminAccountRepository.findById(adminId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        // 1. 현재 비밀번호 일치 (A004)
        if (!passwordEncoder.matches(request.currentPassword(), admin.getPasswordHash())) {
            throw new BusinessException(ErrorCode.PASSWORD_MISMATCH);
        }

        // 2. 새 비밀번호 유효성 (C001): 현재 비번과 동일 금지 + 강도 조합
        if (request.newPassword().equals(request.currentPassword())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }
        if (!isStrongPassword(request.newPassword())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }

        // 3. 일일 변경 시도 5회 제한 (C004)
        if (tokenService.getPasswordChangeCount(adminId) >= MAX_PWD_CHANGE_PER_DAY) {
            throw new BusinessException(ErrorCode.RATE_LIMIT_EXCEEDED);
        }

        // 4. BCrypt(strength 10) 해시 → 엔티티 갱신 + 카운터 증가
        admin.changePassword(passwordEncoder.encode(request.newPassword()));
        tokenService.incrementPasswordChangeCount(adminId);

        // 5. 변경 이력 기록 (admin_password_change_logs)
        String ip = extractIp(httpRequest);
        adminPasswordChangeLogRepository.save(AdminPasswordChangeLog.of(admin, ip));

        // 6. 다른 세션 강제 로그아웃 (기본 true: RT 삭제로 재로그인 유도)
        int loggedOutSessions = 0;
        boolean logoutOthers = request.logoutOtherSessions() == null || request.logoutOtherSessions();
        if (logoutOthers) {
            tokenService.deleteAdminRefreshToken(adminId);
            loggedOutSessions = 1;
        }

        return new AdminPasswordChangeResponse("비밀번호가 변경되었습니다", loggedOutSessions);
    }

    /** 현재 관리자 정보 조회 (§1.5) */
    public AdminMeResponse getMe(Long adminId) {
        AdminAccount admin = adminAccountRepository.findById(adminId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));
        return AdminMeResponse.from(admin);
    }

    // ── 헬퍼 ────────────────────────────────────────────────────────────────────

    /** nginx/ALB 뒤에 있는 경우 X-Forwarded-For 우선, 그 외 RemoteAddr */
    private String extractIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }

    private String truncate(String value, int maxLength) {
        if (value == null) return null;
        return value.length() > maxLength ? value.substring(0, maxLength) : value;
    }

    /** 비밀번호 강도: 영문 대소 + 숫자 + 특수문자 모두 포함. 길이는 @Size로 별도 검증 */
    private boolean isStrongPassword(String password) {
        boolean hasLower = password.matches(".*[a-z].*");
        boolean hasUpper = password.matches(".*[A-Z].*");
        boolean hasDigit = password.matches(".*\\d.*");
        boolean hasSpecial = password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\",.<>/?\\\\|`~].*");
        return hasLower && hasUpper && hasDigit && hasSpecial;
    }
}
