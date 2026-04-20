package com.ember.ember.aireport.service;

import com.ember.ember.aireport.domain.LifestyleAnalysisLog;
import com.ember.ember.aireport.repository.LifestyleAnalysisLogRepository;
import com.ember.ember.cache.service.CacheService;
import com.ember.ember.idealtype.domain.UserPersonalityKeyword;
import com.ember.ember.idealtype.domain.UserPersonalityKeyword.TagType;
import com.ember.ember.idealtype.repository.UserPersonalityKeywordRepository;
import com.ember.ember.messaging.event.AiAnalysisResultEvent;
import com.ember.ember.messaging.event.AiAnalysisResultEvent.LifestyleResult;
import com.ember.ember.messaging.event.AiAnalysisResultEvent.Tag;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 라이프스타일 분석 결과 처리 핸들러 (M6).
 * AiResultConsumer에서 LIFESTYLE_ANALYSIS_COMPLETED / FAILED 수신 시 호출.
 *
 * 완료 처리:
 *   1. Redis AI:LIFESTYLE:{userId} 에 분석 결과 저장 (TTL 24h) — 중복 트리거 방지 키
 *   2. user_personality_keywords 누적 업데이트
 *      - 기존 (userId, tagType, label) 행 있으면 accumulateScore
 *      - 없으면 신규 INSERT
 *
 * 실패 처리:
 *   WARN 로그만 (사용자 영향 최소 — 다음 일기 분석 완료 시 재트리거 가능)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LifestyleAnalysisResultHandler {

    /** 라이프스타일 Redis 캐시 키 패턴 */
    private static final String CACHE_KEY_AI_LIFESTYLE = "AI:LIFESTYLE:%d";

    /** Redis 캐시 TTL: 24시간 (중복 트리거 방지 디바운스 기간과 동일) */
    private static final Duration CACHE_TTL_24H = Duration.ofHours(24);

    private final CacheService cacheService;
    private final UserPersonalityKeywordRepository userPersonalityKeywordRepository;
    private final UserRepository userRepository;
    private final LifestyleAnalysisLogRepository lifestyleAnalysisLogRepository;

    /**
     * 라이프스타일 분석 완료 처리.
     *
     * @param event LIFESTYLE_ANALYSIS_COMPLETED 이벤트
     */
    @Transactional
    public void handleCompleted(AiAnalysisResultEvent event) {
        Long userId = event.userId();
        LifestyleResult lifestyleResult = event.lifestyleResult();

        if (userId == null || lifestyleResult == null) {
            log.warn("[LifestyleAnalysisResultHandler] userId 또는 lifestyleResult 누락 — messageId={}",
                    event.messageId());
            return;
        }

        // ── 1. Redis 캐시 저장 (AI:LIFESTYLE:{userId}, TTL 24h) ─────────────
        // 이 키의 존재가 LifestyleAnalysisService 중복 트리거 방지 기준이 된다.
        String cacheKey = String.format(CACHE_KEY_AI_LIFESTYLE, userId);
        cacheService.set(cacheKey, lifestyleResult, CACHE_TTL_24H);
        log.debug("[LifestyleAnalysisResultHandler] 라이프스타일 캐시 저장 완료 — userId={}", userId);

        // ── 2. user_personality_keywords 누적 업데이트 + lifestyle_analysis_log INSERT ───────────
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            log.warn("[LifestyleAnalysisResultHandler] 사용자 없음 — userId={}", userId);
            return;
        }

        // 2-a. user_personality_keywords upsert
        List<Tag> keywords = lifestyleResult.keywords();
        if (keywords != null && !keywords.isEmpty()) {
            upsertPersonalityKeywords(user, keywords);
        }

        // 2-b. lifestyle_analysis_log INSERT (이력 추적)
        insertAnalysisLog(user, event.analyzedAt(), lifestyleResult);

        log.info("[LifestyleAnalysisResultHandler] 라이프스타일 분석 완료 처리 성공 — userId={}, patterns={}",
                userId,
                lifestyleResult.dominantPatterns() != null ? lifestyleResult.dominantPatterns() : "[]");
    }

    /**
     * 라이프스타일 분석 실패 처리.
     * WARN 로그만 기록하여 다음 트리거 시 재분석이 가능하도록 한다.
     *
     * @param event LIFESTYLE_ANALYSIS_FAILED 이벤트
     */
    public void handleFailed(AiAnalysisResultEvent event) {
        log.warn("[LifestyleAnalysisResultHandler] 라이프스타일 분석 실패 — userId={}, errorCode={}",
                event.userId(),
                event.error() != null ? event.error().code() : "unknown");
    }

    // -------------------------------------------------------------------------
    // private 헬퍼
    // -------------------------------------------------------------------------

    /**
     * 라이프스타일 분석 결과 태그를 user_personality_keywords에 upsert.
     *
     * 누적 정책:
     *   - 동일 (userId, tagType, label) 행 존재: weight += score (accumulateScore)
     *   - 미존재: 신규 INSERT
     *
     * @param user     대상 사용자 엔티티
     * @param keywords 분석 결과 키워드 태그 목록
     */
    private void upsertPersonalityKeywords(User user, List<Tag> keywords) {
        for (Tag tag : keywords) {
            TagType tagType;
            try {
                tagType = TagType.valueOf(tag.type());
            } catch (IllegalArgumentException e) {
                log.warn("[LifestyleAnalysisResultHandler] 알 수 없는 태그 타입 스킵 — type={}, label={}",
                        tag.type(), tag.label());
                continue;
            }

            BigDecimal score = BigDecimal.valueOf(tag.score())
                    .setScale(4, RoundingMode.HALF_UP);

            // 기존 행 조회
            userPersonalityKeywordRepository
                    .findByUserIdAndTagTypeAndLabel(user.getId(), tagType, tag.label())
                    .ifPresentOrElse(
                            existing -> existing.accumulateScore(score, existing.getAnalyzedDiaryCount() + 1),
                            () -> userPersonalityKeywordRepository.save(
                                    UserPersonalityKeyword.create(user, tagType, tag.label(), score, 1))
                    );
        }
        log.debug("[LifestyleAnalysisResultHandler] user_personality_keywords upsert 완료 — userId={}, 키워드수={}",
                user.getId(), keywords.size());
    }

    /**
     * 라이프스타일 분석 이력을 lifestyle_analysis_log에 INSERT.
     *
     * analyzedAt 파싱:
     *   FastAPI가 ISO-8601 KST 문자열로 반환하므로 ZonedDateTime.parse()로 파싱.
     *   파싱 실패 시 현재 시각으로 폴백.
     *
     * @param user            분석 대상 사용자
     * @param analyzedAtStr   FastAPI 반환 분석 완료 시각 문자열
     * @param lifestyleResult 라이프스타일 분석 결과
     */
    private void insertAnalysisLog(User user, String analyzedAtStr, LifestyleResult lifestyleResult) {
        // analyzedAt 파싱 (ISO-8601 KST)
        LocalDateTime analyzedAt;
        try {
            analyzedAt = ZonedDateTime.parse(analyzedAtStr, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                    .toLocalDateTime();
        } catch (Exception e) {
            log.warn("[LifestyleAnalysisResultHandler] analyzedAt 파싱 실패, 현재 시각으로 폴백 — userId={}", user.getId());
            analyzedAt = LocalDateTime.now();
        }

        // emotionProfile Map 구성 (LifestyleResult.EmotionProfile → Map<String, Double>)
        Map<String, Double> emotionProfileMap = null;
        if (lifestyleResult.emotionProfile() != null) {
            emotionProfileMap = new HashMap<>();
            emotionProfileMap.put("positive", lifestyleResult.emotionProfile().positive());
            emotionProfileMap.put("negative", lifestyleResult.emotionProfile().negative());
            emotionProfileMap.put("neutral", lifestyleResult.emotionProfile().neutral());
        }

        // 분석에 사용된 일기 편수 (keywords 수가 아닌 dominantPatterns 기준으로 간접 추정)
        // 정확한 편수는 LifestyleAnalysisService에서 payload 구성 시 결정되므로,
        // keywords 수가 있으면 해당 크기를 diaryCount로 대리 사용. 향후 이벤트 스펙에 diaryCount 추가 권장.
        int diaryCount = lifestyleResult.keywords() != null ? lifestyleResult.keywords().size() : 0;

        LifestyleAnalysisLog analysisLog = LifestyleAnalysisLog.create(
                user,
                analyzedAt,
                diaryCount,
                lifestyleResult.dominantPatterns(),
                emotionProfileMap,
                lifestyleResult.summary(),
                null  // rawResult: 현재 이벤트 스펙에 원본 미포함. 향후 OpenTelemetry 연동 시 추가.
        );
        lifestyleAnalysisLogRepository.save(analysisLog);
        log.debug("[LifestyleAnalysisResultHandler] lifestyle_analysis_log INSERT 완료 — userId={}", user.getId());
    }
}
