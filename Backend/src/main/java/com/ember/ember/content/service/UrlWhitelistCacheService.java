package com.ember.ember.content.service;

import com.ember.ember.cache.service.CacheService;
import com.ember.ember.global.moderation.repository.UrlWhitelistRepository;
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
 * URL 화이트리스트 캐시 서비스.
 *
 * Cache-Aside 패턴:
 *   1. Redis 키 URL_WHITELIST 조회 (HIT → 즉시 반환)
 *   2. MISS → UrlWhitelistRepository.findAllActive() 조회 후 Redis SETEX 1h
 *   3. Redis 장애 → WARN 로그 + DB 직접 조회 fallback
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UrlWhitelistCacheService {

    /** 설계서 §5.2 캐시 키 */
    private static final String CACHE_KEY = "URL_WHITELIST";
    /** TTL 1시간 */
    private static final Duration TTL = Duration.ofHours(1);

    private final CacheService cacheService;
    private final UrlWhitelistRepository urlWhitelistRepository;
    private final ObjectMapper objectMapper;

    /**
     * 활성 URL 화이트리스트 도메인 Set 반환.
     *
     * @return 허용 도메인 문자열 Set (예: "example.com", "instagram.com")
     */
    public Set<String> getUrlWhitelist() {
        // ── 캐시 조회 ─────────────────────────────────────────────────────────
        Optional<String> cachedJson = cacheService.get(CACHE_KEY, String.class);
        if (cachedJson.isPresent()) {
            try {
                Set<String> domains = objectMapper.readValue(
                    cachedJson.get(),
                    new TypeReference<Set<String>>() {}
                );
                log.debug("[UrlWhitelistCache] 캐시 HIT — 도메인 {}건", domains.size());
                return domains;
            } catch (Exception e) {
                // 역직렬화 실패 시 WARN 후 DB fallback
                log.warn("[UrlWhitelistCache] 캐시 역직렬화 실패 — DB fallback 수행: {}", e.getMessage());
            }
        }

        // ── DB 조회 + 캐시 저장 ───────────────────────────────────────────────
        return loadAndCache();
    }

    /**
     * DB에서 URL 화이트리스트를 조회하고 Redis에 캐시 저장 후 반환.
     */
    private Set<String> loadAndCache() {
        Set<String> domains = urlWhitelistRepository.findAllActive()
            .stream()
            .map(uw -> uw.getDomain())
            .collect(Collectors.toSet());

        log.info("[UrlWhitelistCache] DB 조회 완료 — 허용 도메인 {}건 캐시 적재 시도", domains.size());

        try {
            String json = objectMapper.writeValueAsString(domains);
            cacheService.set(CACHE_KEY, json, TTL);
        } catch (Exception e) {
            // 직렬화 실패해도 조회 결과는 반환
            log.warn("[UrlWhitelistCache] 캐시 직렬화 실패 — Redis 저장 생략: {}", e.getMessage());
        }

        return domains;
    }
}
