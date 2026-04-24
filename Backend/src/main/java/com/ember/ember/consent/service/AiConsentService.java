package com.ember.ember.consent.service;

import com.ember.ember.cache.service.CacheService;
import com.ember.ember.consent.repository.AiConsentLogRepository;
import com.ember.ember.observability.metric.AiMetrics;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

/**
 * AI 동의 상태 확인 서비스.
 * Redis 캐시: CONSENT:{userId}:{consentType} (TTL 30분)
 * 동의 등록/철회 시 캐시 무효화 필요 → invalidateConsent() 호출.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiConsentService {

    private static final Duration CONSENT_CACHE_TTL = Duration.ofMinutes(30);
    private static final String CONSENT_KEY_PREFIX = "CONSENT:";

    private final AiConsentLogRepository aiConsentLogRepository;
    private final AiMetrics aiMetrics;
    private final CacheService cacheService;

    /**
     * 특정 사용자가 특정 AI 동의 유형에 동의했는지 확인.
     * Redis 캐시 히트 시 DB 조회 생략.
     */
    @Transactional(readOnly = true)
    public boolean hasGrantedConsent(Long userId, String consentType) {
        String cacheKey = CONSENT_KEY_PREFIX + userId + ":" + consentType;

        return cacheService.getOrLoad(cacheKey, CONSENT_CACHE_TTL, () -> {
            return aiConsentLogRepository
                    .findLatestByUserIdAndConsentType(userId, consentType)
                    .map(log -> {
                        boolean granted = "GRANTED".equals(log.getAction());
                        String result = granted ? "granted" : "revoked";
                        aiMetrics.aiConsentVerificationCounter(result).increment();
                        return granted;
                    })
                    .orElseGet(() -> {
                        aiMetrics.aiConsentVerificationCounter("missing").increment();
                        return false;
                    });
        }, Boolean.class);
    }

    /**
     * 동의 상태 변경 시 캐시 무효화.
     * ConsentService.registerConsent() / AccountService.revokeConsent() 에서 호출.
     */
    public void invalidateConsent(Long userId, String consentType) {
        cacheService.invalidate(CONSENT_KEY_PREFIX + userId + ":" + consentType);
    }
}
