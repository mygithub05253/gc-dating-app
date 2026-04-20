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
}
