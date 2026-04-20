package com.ember.ember.cache.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * Redis Cache-Aside 패턴 서비스
 *
 * Redis 장애 시 폴백 정책:
 *   - get(): WARN 로그 + Optional.empty() 반환 → 호출자가 DB 조회로 폴백
 *   - set(): WARN 로그 + 무시 (캐시 미저장, 다음 요청에서 재시도)
 *   - getOrLoad(): Redis 실패 시 loader 결과를 그대로 반환 (캐시 저장은 생략)
 *
 * 캐시 키 네이밍 컨벤션 (설계서 §5.2):
 *   AI:DIARY:{diaryId}          TTL 24h
 *   AI:LIFESTYLE:{userId}       TTL 24h
 *   MATCHING:RECO:{userId}      TTL 10분
 *   BRIEFING:{userId}           TTL 24h
 *   BANNED_WORDS:ALL            TTL 1h
 *   URL_WHITELIST               TTL 1h
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CacheService {

    @Qualifier("objectRedisTemplate")
    private final RedisTemplate<String, Object> objectRedisTemplate;

    private final ObjectMapper objectMapper;

    /**
     * 캐시에서 값을 조회하여 지정 타입으로 역직렬화.
     * Redis 장애 시 Optional.empty() 반환 → 호출자가 DB 폴백.
     *
     * @param key  캐시 키
     * @param type 역직렬화 대상 클래스
     * @return 캐시 히트 시 Optional.of(value), 미스 또는 장애 시 Optional.empty()
     */
    public <T> Optional<T> get(String key, Class<T> type) {
        try {
            Object raw = objectRedisTemplate.opsForValue().get(key);
            if (raw == null) {
                return Optional.empty();
            }
            T value = objectMapper.convertValue(raw, type);
            return Optional.of(value);
        } catch (Exception e) {
            log.warn("[CacheService] Redis 조회 실패 — key={}, 이유={}", key, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * 캐시에 값을 저장.
     * Redis 장애 시 WARN 로그 후 무시 (애플리케이션 정상 흐름 유지).
     *
     * @param key   캐시 키
     * @param value 저장할 값
     * @param ttl   유효 기간
     */
    public <T> void set(String key, T value, Duration ttl) {
        try {
            objectRedisTemplate.opsForValue().set(key, value, ttl);
        } catch (Exception e) {
            log.warn("[CacheService] Redis 저장 실패 — key={}, 이유={}", key, e.getMessage());
        }
    }

    /**
     * 캐시에서 특정 키를 삭제.
     * AI 분석 완료, 동의 철회 등 캐시 무효화 시 호출.
     *
     * @param key 삭제할 캐시 키
     */
    public void invalidate(String key) {
        try {
            objectRedisTemplate.delete(key);
        } catch (Exception e) {
            log.warn("[CacheService] Redis 삭제 실패 — key={}, 이유={}", key, e.getMessage());
        }
    }

    /**
     * Cache-Aside 패턴 구현.
     * 캐시 히트 시 즉시 반환, 미스 시 loader 실행 후 캐시 저장 후 반환.
     * Redis 장애 시 loader 결과를 캐시 저장 없이 그대로 반환.
     *
     * @param key    캐시 키
     * @param ttl    유효 기간
     * @param loader 캐시 미스 시 실행할 DB 조회 로직
     * @param type   역직렬화 대상 클래스
     * @return loader 결과 또는 캐시 히트 값
     */
    public <T> T getOrLoad(String key, Duration ttl, Supplier<T> loader, Class<T> type) {
        Optional<T> cached = get(key, type);
        if (cached.isPresent()) {
            return cached.get();
        }

        T value = loader.get();
        // Redis 장애 시 set()이 내부에서 WARN 처리하므로 여기선 항상 호출
        set(key, value, ttl);
        return value;
    }
}
