package com.ember.ember.content.service;

import com.ember.ember.cache.service.CacheService;
import com.ember.ember.global.moderation.repository.BannedWordRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 금칙어 캐시 서비스.
 *
 * Cache-Aside 패턴:
 *   1. Redis 키 BANNED_WORDS:ALL 조회 (HIT → 즉시 반환)
 *   2. MISS → BannedWordRepository.findAllActive() 조회 후 Redis SETEX 1h
 *   3. Redis 장애 → WARN 로그 + DB 직접 조회 fallback
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BannedWordCacheService {

    /** 설계서 §5.2 캐시 키 */
    private static final String CACHE_KEY = "BANNED_WORDS:ALL";
    /** TTL 1시간 */
    private static final Duration TTL = Duration.ofHours(1);

    private final CacheService cacheService;
    private final BannedWordRepository bannedWordRepository;
    private final ObjectMapper objectMapper;

    /**
     * 활성 금칙어 Set 반환.
     *
     * @return 금칙어 문자열 Set (소문자 정규화 없음 — 원본 그대로)
     */
    public Set<String> getBannedWords() {
        // ── 캐시 조회 ─────────────────────────────────────────────────────────
        Optional<String> cachedJson = cacheService.get(CACHE_KEY, String.class);
        if (cachedJson.isPresent()) {
            try {
                Set<String> words = objectMapper.readValue(
                    cachedJson.get(),
                    new TypeReference<Set<String>>() {}
                );
                log.debug("[BannedWordCache] 캐시 HIT — 단어 {}건", words.size());
                return words;
            } catch (Exception e) {
                // 역직렬화 실패 시 WARN 후 DB fallback
                log.warn("[BannedWordCache] 캐시 역직렬화 실패 — DB fallback 수행: {}", e.getMessage());
            }
        }

        // ── DB 조회 + 캐시 저장 ───────────────────────────────────────────────
        return loadAndCache();
    }

    /**
     * DB에서 금칙어를 조회하고 Redis에 캐시 저장 후 반환.
     */
    private Set<String> loadAndCache() {
        Set<String> words = bannedWordRepository.findAllActive()
            .stream()
            .map(bw -> bw.getWord())
            .collect(Collectors.toSet());

        log.info("[BannedWordCache] DB 조회 완료 — 금칙어 {}건 캐시 적재 시도", words.size());

        try {
            String json = objectMapper.writeValueAsString(words);
            cacheService.set(CACHE_KEY, json, TTL);
        } catch (Exception e) {
            // 직렬화 실패해도 조회 결과는 반환 (캐시 저장만 생략)
            log.warn("[BannedWordCache] 캐시 직렬화 실패 — Redis 저장 생략: {}", e.getMessage());
        }

        return words;
    }
}
