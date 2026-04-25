package com.ember.ember.admin.service.inbox;

import com.ember.ember.admin.repository.inbox.AdminNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

/**
 * 관리자별 미읽음 알림 카운트 Redis 캐시 서비스 (명세서 §11.2 비기능: P95<1초).
 *
 * <p>Redis 키 컨벤션: {@code ADMIN_INBOX:UNREAD:{adminId}}, TTL 1시간 (이벤트 발생 시 갱신).
 * Redis 장애 시 DB 카운트로 폴백한다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminInboxCounterService {

    private static final String KEY_PREFIX = "ADMIN_INBOX:UNREAD:";
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    private final StringRedisTemplate stringRedisTemplate;
    private final AdminNotificationRepository notificationRepository;

    /**
     * 관리자에게 노출되는 미읽음 알림 수 조회.
     * Redis 캐시 우선, 미스 또는 장애 시 DB COUNT로 폴백 후 캐시 워밍.
     */
    public long getUnreadCount(Long adminId) {
        String key = key(adminId);
        Optional<String> cached = readCache(key);
        if (cached.isPresent()) {
            try {
                return Long.parseLong(cached.get());
            } catch (NumberFormatException ex) {
                log.warn("Redis 미읽음 카운터 형식 오류, DB 폴백: key={}", key);
            }
        }
        long fromDb = notificationRepository.countUnreadForAdmin(adminId);
        warmCache(key, fromDb);
        return fromDb;
    }

    /** 새 알림 발행 시 카운터 +1 (assignedTo가 null이면 모든 관리자 캐시 무효화 효과). */
    public void increment(Long adminId) {
        if (adminId == null) {
            // 미할당 알림은 모든 관리자에게 보이므로 개별 카운터 갱신 대신
            // 발행 시점에 invalidateAll 호출자가 처리하도록 위임.
            return;
        }
        String key = key(adminId);
        try {
            stringRedisTemplate.opsForValue().increment(key);
            stringRedisTemplate.expire(key, CACHE_TTL);
        } catch (DataAccessException ex) {
            log.warn("Redis 미읽음 카운터 증가 실패 (DB 카운트로 폴백 가능): key={}", key, ex);
        }
    }

    /** 알림 읽음/처리 완료 시 카운터 -1 (0 이하 방어). */
    public void decrement(Long adminId) {
        if (adminId == null) {
            return;
        }
        String key = key(adminId);
        try {
            Long after = stringRedisTemplate.opsForValue().decrement(key);
            if (after != null && after < 0) {
                stringRedisTemplate.opsForValue().set(key, "0", CACHE_TTL);
            } else {
                stringRedisTemplate.expire(key, CACHE_TTL);
            }
        } catch (DataAccessException ex) {
            log.warn("Redis 미읽음 카운터 감소 실패: key={}", key, ex);
        }
    }

    /** 특정 관리자 캐시 강제 무효화 (DB COUNT 재계산 유도). */
    public void invalidate(Long adminId) {
        if (adminId == null) {
            return;
        }
        try {
            stringRedisTemplate.delete(key(adminId));
        } catch (DataAccessException ex) {
            log.warn("Redis 미읽음 카운터 무효화 실패: adminId={}", adminId, ex);
        }
    }

    private Optional<String> readCache(String key) {
        try {
            return Optional.ofNullable(stringRedisTemplate.opsForValue().get(key));
        } catch (DataAccessException ex) {
            log.warn("Redis 미읽음 카운터 조회 실패, DB 폴백: key={}", key, ex);
            return Optional.empty();
        }
    }

    private void warmCache(String key, long value) {
        try {
            stringRedisTemplate.opsForValue().set(key, String.valueOf(value), CACHE_TTL);
        } catch (DataAccessException ex) {
            log.warn("Redis 미읽음 카운터 캐시 워밍 실패: key={}", key, ex);
        }
    }

    private String key(Long adminId) {
        return KEY_PREFIX + adminId;
    }
}
