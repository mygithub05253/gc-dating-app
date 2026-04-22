package com.ember.ember.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class TokenService {

    private static final String RT_PREFIX = "RT:";
    private static final String BL_PREFIX = "BL:";
    private static final String RESTORE_PREFIX = "RESTORE:";
    // 관리자 전용 키 (관리자 API 통합명세서 v2.1 §1.1)
    private static final String ADMIN_RT_PREFIX = "RT:ADMIN:";
    private static final String ADMIN_LOGIN_FAIL_PREFIX = "login:failed:";
    private static final String ADMIN_PWD_CHANGE_PREFIX = "password_change:";

    private final RedisTemplate<String, String> redisTemplate;

    /** Refresh Token 저장 */
    public void saveRefreshToken(Long userId, String refreshToken, long expirationMs) {
        redisTemplate.opsForValue().set(RT_PREFIX + userId, refreshToken, expirationMs, TimeUnit.MILLISECONDS);
    }

    /** Refresh Token 조회 */
    public String getRefreshToken(Long userId) {
        return redisTemplate.opsForValue().get(RT_PREFIX + userId);
    }

    /** Refresh Token 삭제 */
    public void deleteRefreshToken(Long userId) {
        redisTemplate.delete(RT_PREFIX + userId);
    }

    /** Access Token 블랙리스트 등록 */
    public void addToBlacklist(String accessToken, long remainingExpirationMs) {
        if (remainingExpirationMs > 0) {
            redisTemplate.opsForValue().set(BL_PREFIX + accessToken, "logout", remainingExpirationMs, TimeUnit.MILLISECONDS);
        }
    }

    /** 블랙리스트 여부 확인 */
    public boolean isBlacklisted(String accessToken) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(BL_PREFIX + accessToken));
    }

    /** 탈퇴 유예 계정 복구용 1회성 토큰 저장 (TTL 10분) */
    public void saveRestoreToken(Long userId, String restoreToken) {
        redisTemplate.opsForValue().set(RESTORE_PREFIX + userId, restoreToken, 10, TimeUnit.MINUTES);
    }

    /** 복구 토큰 조회 */
    public String getRestoreToken(Long userId) {
        return redisTemplate.opsForValue().get(RESTORE_PREFIX + userId);
    }

    /** 복구 토큰 삭제 */
    public void deleteRestoreToken(Long userId) {
        redisTemplate.delete(RESTORE_PREFIX + userId);
    }

    // ── 관리자 전용 (관리자 API 통합명세서 v2.1 §1.1) ─────────────────────────────

    /** 관리자 Refresh Token 저장 (RT:ADMIN:{adminId}, TTL 7일) */
    public void saveAdminRefreshToken(Long adminId, String refreshToken, long expirationMs) {
        redisTemplate.opsForValue().set(ADMIN_RT_PREFIX + adminId, refreshToken, expirationMs, TimeUnit.MILLISECONDS);
    }

    /** 관리자 Refresh Token 조회 */
    public String getAdminRefreshToken(Long adminId) {
        return redisTemplate.opsForValue().get(ADMIN_RT_PREFIX + adminId);
    }

    /** 관리자 Refresh Token 삭제 */
    public void deleteAdminRefreshToken(Long adminId) {
        redisTemplate.delete(ADMIN_RT_PREFIX + adminId);
    }

    /** 관리자 로그인 실패 카운터 증가 (최초 증가 시 TTL 15분 부여) */
    public long incrementLoginFailCount(String email) {
        String key = ADMIN_LOGIN_FAIL_PREFIX + email;
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redisTemplate.expire(key, 15, TimeUnit.MINUTES);
        }
        return count == null ? 0L : count;
    }

    /** 관리자 로그인 실패 카운터 조회 */
    public long getLoginFailCount(String email) {
        String value = redisTemplate.opsForValue().get(ADMIN_LOGIN_FAIL_PREFIX + email);
        return value == null ? 0L : Long.parseLong(value);
    }

    /** 관리자 로그인 실패 카운터 삭제 (로그인 성공 시) */
    public void resetLoginFailCount(String email) {
        redisTemplate.delete(ADMIN_LOGIN_FAIL_PREFIX + email);
    }

    /** 관리자 비밀번호 변경 카운터 증가 (최초 증가 시 TTL 1일 부여) */
    public long incrementPasswordChangeCount(Long adminId) {
        String key = ADMIN_PWD_CHANGE_PREFIX + adminId;
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redisTemplate.expire(key, 1, TimeUnit.DAYS);
        }
        return count == null ? 0L : count;
    }

    /** 관리자 비밀번호 변경 카운터 조회 */
    public long getPasswordChangeCount(Long adminId) {
        String value = redisTemplate.opsForValue().get(ADMIN_PWD_CHANGE_PREFIX + adminId);
        return value == null ? 0L : Long.parseLong(value);
    }
}
