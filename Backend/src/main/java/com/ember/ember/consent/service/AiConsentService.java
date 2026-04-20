package com.ember.ember.consent.service;

import com.ember.ember.consent.repository.AiConsentLogRepository;
import com.ember.ember.observability.metric.AiMetrics;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * AI 동의 상태 확인 서비스.
 * 결정 4: ConsentType/ConsentAction Enum → String 기반으로 변경.
 *
 * 현재는 DB 직접 조회 방식으로 구현.
 * TODO(M4 또는 별도 캐시화 스프린트): Redis 캐시 도입
 *   - 키: CONSENT:{userId}:{consentType}
 *   - TTL: 30분 (동의 상태 변경 시 무효화)
 *   - 동의 철회 시 CacheService.invalidate() 호출 필요
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiConsentService {

    private final AiConsentLogRepository aiConsentLogRepository;
    private final AiMetrics aiMetrics;

    /**
     * 특정 사용자가 특정 AI 동의 유형에 동의했는지 확인.
     * 가장 최근 이력의 action이 "GRANTED"이면 동의로 판단.
     * 이력이 없으면 미동의 처리.
     *
     * @param userId      사용자 PK
     * @param consentType 확인할 동의 유형 문자열 ("AI_ANALYSIS" / "AI_DATA_USAGE")
     * @return 동의 여부 (true: 동의, false: 미동의 또는 이력 없음)
     */
    @Transactional(readOnly = true)
    public boolean hasGrantedConsent(Long userId, String consentType) {
        return aiConsentLogRepository
                .findLatestByUserIdAndConsentType(userId, consentType)
                .map(log -> {
                    boolean granted = "GRANTED".equals(log.getAction());
                    // 동의 확인 결과를 Counter로 기록 (granted / revoked)
                    String result = granted ? "granted" : "revoked";
                    aiMetrics.aiConsentVerificationCounter(result).increment();
                    return granted;
                })
                .orElseGet(() -> {
                    // 이력 없음 — missing으로 기록
                    aiMetrics.aiConsentVerificationCounter("missing").increment();
                    return false;
                });
    }
}
