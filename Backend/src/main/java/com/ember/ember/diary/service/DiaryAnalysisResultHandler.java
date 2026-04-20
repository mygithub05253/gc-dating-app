package com.ember.ember.diary.service;

import com.ember.ember.aireport.service.LifestyleAnalysisService;
import com.ember.ember.cache.service.CacheService;
import com.ember.ember.diary.domain.Diary;
import com.ember.ember.diary.domain.DiaryKeyword;
import com.ember.ember.diary.domain.DiaryKeyword.TagType;
import com.ember.ember.diary.domain.UserActivityEvent;
import com.ember.ember.diary.repository.DiaryKeywordRepository;
import com.ember.ember.diary.repository.DiaryRepository;
import com.ember.ember.diary.repository.UserActivityEventRepository;
import com.ember.ember.messaging.event.AiAnalysisResultEvent;
import com.ember.ember.messaging.outbox.repository.OutboxEventRepository;
import com.ember.ember.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;

/**
 * AI 분석 결과 처리 핸들러.
 * AiResultConsumer에서 호출되어 분석 완료/실패 처리를 수행.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DiaryAnalysisResultHandler {

    /** AI 분석 결과 Redis 캐시 키 패턴 */
    private static final String CACHE_KEY_AI_DIARY = "AI:DIARY:%d";

    /** Redis 캐시 TTL: 24시간 */
    private static final Duration CACHE_TTL_24H = Duration.ofHours(24);

    private final DiaryRepository diaryRepository;
    private final DiaryKeywordRepository diaryKeywordRepository;
    private final UserActivityEventRepository userActivityEventRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final UserRepository userRepository;
    private final CacheService cacheService;
    private final ObjectMapper objectMapper;
    private final LifestyleAnalysisService lifestyleAnalysisService;

    /**
     * AI 분석 완료 처리.
     *
     * 처리 순서:
     *   1. Diary 조회 (없으면 WARN 로그 후 return)
     *   2. diary_keywords batch INSERT
     *   3. diary.analysisStatus = COMPLETED 업데이트
     *   4. Redis 캐시 저장 (AI:DIARY:{diaryId}, TTL 24h)
     *   5. user_activity_events INSERT (AI_ANALYSIS_COMPLETED)
     *   6. diaryCount >= 5 확인 → LIFESTYLE_ANALYZE_REQUESTED OutboxEvent 생성
     *   7. FCM 푸시는 M7에서 구현 (TODO)
     *
     * @param event 분석 완료 이벤트
     */
    @Transactional
    public void handleCompleted(AiAnalysisResultEvent event) {
        Long diaryId = event.diaryId();
        Long userId = event.userId();

        // 1. Diary 조회
        Diary diary = diaryRepository.findById(diaryId).orElse(null);
        if (diary == null) {
            log.warn("[DiaryAnalysisResultHandler] 일기 없음 — diaryId={}", diaryId);
            return;
        }

        AiAnalysisResultEvent.Result result = event.result();
        if (result == null) {
            log.warn("[DiaryAnalysisResultHandler] 결과 데이터 없음 — diaryId={}", diaryId);
            return;
        }

        // 2. diary_keywords batch INSERT
        List<DiaryKeyword> keywords = buildKeywords(diary, result.tags());
        if (!keywords.isEmpty()) {
            diaryKeywordRepository.saveAll(keywords);
        }

        // 3. diary.analysisStatus = COMPLETED 업데이트
        diary.completeAnalysis(result.summary(), result.category());
        diaryRepository.save(diary);

        // 4. Redis 캐시 저장
        String cacheKey = String.format(CACHE_KEY_AI_DIARY, diaryId);
        cacheService.set(cacheKey, result, CACHE_TTL_24H);

        // 5. user_activity_events INSERT
        userRepository.findById(userId).ifPresent(user -> {
            UserActivityEvent activityEvent = UserActivityEvent.of(
                    user,
                    "AI_ANALYSIS_COMPLETED",
                    "DIARY",
                    diaryId,
                    null
            );
            userActivityEventRepository.save(activityEvent);
        });

        // 6. 라이프스타일 분석 트리거 (LifestyleAnalysisService: COMPLETED ≥ 5 + 24h 중복방지)
        lifestyleAnalysisService.triggerIfEligible(userId);

        // 7. FCM 푸시 — TODO(M7): 관측성/알림 마일스톤에서 구현
        log.info("[DiaryAnalysisResultHandler] 분석 완료 처리 성공 — diaryId={}, userId={}", diaryId, userId);
    }

    /**
     * AI 분석 실패 처리.
     *
     * 처리 순서:
     *   1. diary.analysisStatus = FAILED 업데이트
     *   2. user_activity_events INSERT (AI_ANALYSIS_FAILED)
     *   3. 관리자 알림 — TODO(M7): 관측성 마일스톤에서 구현
     *
     * @param event 분석 실패 이벤트
     */
    @Transactional
    public void handleFailed(AiAnalysisResultEvent event) {
        Long diaryId = event.diaryId();
        Long userId = event.userId();

        // 1. diary.analysisStatus = FAILED 업데이트
        diaryRepository.findById(diaryId).ifPresentOrElse(
                diary -> {
                    diary.failAnalysis();
                    diaryRepository.save(diary);
                    log.warn("[DiaryAnalysisResultHandler] 분석 실패 처리 — diaryId={}, errorCode={}",
                            diaryId, event.error() != null ? event.error().code() : "unknown");
                },
                () -> log.warn("[DiaryAnalysisResultHandler] 일기 없음 (실패 처리) — diaryId={}", diaryId)
        );

        // 2. user_activity_events INSERT (AI_ANALYSIS_FAILED)
        userRepository.findById(userId).ifPresent(user -> {
            String detail = event.error() != null
                    ? buildErrorDetail(event.error())
                    : null;
            UserActivityEvent activityEvent = UserActivityEvent.of(
                    user,
                    "AI_ANALYSIS_FAILED",
                    "DIARY",
                    diaryId,
                    detail
            );
            userActivityEventRepository.save(activityEvent);
        });

        // 3. 관리자 알림 — TODO(M7): 관측성/알림 마일스톤에서 구현
        log.info("[DiaryAnalysisResultHandler] 분석 실패 처리 완료 — diaryId={}, userId={}", diaryId, userId);
    }

    // -------------------------------------------------------------------------
    // private 헬퍼 메서드
    // -------------------------------------------------------------------------

    /**
     * AI 분석 태그 목록을 DiaryKeyword 엔티티 목록으로 변환.
     * 알 수 없는 tag_type은 WARN 로그 후 건너뜀.
     */
    private List<DiaryKeyword> buildKeywords(Diary diary, List<AiAnalysisResultEvent.Tag> tags) {
        if (tags == null || tags.isEmpty()) {
            return List.of();
        }

        return tags.stream()
                .map(tag -> {
                    try {
                        TagType tagType = TagType.valueOf(tag.type());
                        BigDecimal score = BigDecimal.valueOf(tag.score())
                                .setScale(3, java.math.RoundingMode.HALF_UP);
                        return DiaryKeyword.of(diary, tagType, tag.label(), score);
                    } catch (IllegalArgumentException e) {
                        log.warn("[DiaryAnalysisResultHandler] 알 수 없는 태그 타입 — type={}, label={}",
                                tag.type(), tag.label());
                        return null;
                    }
                })
                .filter(k -> k != null)
                .toList();
    }

    /**
     * 에러 정보를 문자열로 변환 (UserActivityEvent detail 저장용).
     */
    private String buildErrorDetail(AiAnalysisResultEvent.Error error) {
        return String.format("{\"code\":\"%s\",\"detail\":\"%s\"}", error.code(), error.detail());
    }
}
