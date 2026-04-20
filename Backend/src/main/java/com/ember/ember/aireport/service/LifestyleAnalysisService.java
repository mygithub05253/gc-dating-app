package com.ember.ember.aireport.service;

import com.ember.ember.cache.service.CacheService;
import com.ember.ember.diary.domain.Diary;
import com.ember.ember.diary.repository.DiaryRepository;
import com.ember.ember.messaging.event.LifestyleAnalyzeRequestedEvent;
import com.ember.ember.messaging.outbox.entity.OutboxEvent;
import com.ember.ember.messaging.outbox.repository.OutboxEventRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

/**
 * 라이프스타일 분석 자동 트리거 서비스 (M6).
 *
 * 트리거 조건:
 *   - 사용자의 COMPLETED 일기 수 ≥ 5
 *   - 최근 24h 내 분석 기록 없음 (Redis AI:LIFESTYLE:{userId} TTL로 자연 디바운스)
 *
 * 중복 트리거 방지:
 *   AI:LIFESTYLE:{userId} 키가 Redis에 존재하면 즉시 반환.
 *   TTL이 24h이므로 같은 사용자가 24h 내 여러 번 일기를 분석 완료해도 1회만 트리거.
 *
 * 호출 지점:
 *   DiaryAnalysisResultHandler.handleCompleted() 내에서 기존 triggerLifestyleAnalyze() 대체.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LifestyleAnalysisService {

    /** 라이프스타일 분석 Redis 캐시 키 패턴 */
    private static final String CACHE_KEY_AI_LIFESTYLE = "AI:LIFESTYLE:%d";

    /** 라이프스타일 분석 트리거 기준 COMPLETED 일기 건수 */
    private static final long LIFESTYLE_TRIGGER_DIARY_COUNT = 5L;

    /**
     * 라이프스타일 분석 payload 최근 일기 수.
     * 스펙: lifestyle.analyze.v1 최대 20편 (M6 스펙 §3.1).
     * 분석 품질과 payload 크기 간 균형을 고려해 20편으로 설정.
     */
    private static final int RECENT_DIARY_LIMIT = 20;

    /** KST 시간대 */
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final DiaryRepository diaryRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final CacheService cacheService;
    private final ObjectMapper objectMapper;

    /**
     * 라이프스타일 분석 트리거 조건을 확인하고, 충족 시 OutboxEvent를 생성한다.
     *
     * 처리 흐름:
     *   1. COMPLETED 일기 수 < 5 → 조건 미충족, return
     *   2. Redis AI:LIFESTYLE:{userId} 존재 → 24h 내 분석 기록, 중복 방지, return
     *   3. 최근 COMPLETED 일기 10편 조회 → LifestyleAnalyzeRequestedEvent 구성
     *   4. OutboxEvent(LIFESTYLE_ANALYZE_REQUESTED) PENDING 저장
     *
     * 주의: 이 메서드는 반드시 기존 트랜잭션 내에서 호출되거나
     *       독립 @Transactional 메서드로 사용해야 한다.
     *
     * @param userId 라이프스타일 분석 트리거 대상 사용자 PK
     */
    @Transactional
    public void triggerIfEligible(Long userId) {
        // ── 1. COMPLETED 일기 건수 확인 ─────────────────────────────────────
        long completedCount = diaryRepository.countByUserIdAndAnalysisStatus(
                userId, Diary.AnalysisStatus.COMPLETED);

        if (completedCount < LIFESTYLE_TRIGGER_DIARY_COUNT) {
            log.debug("[LifestyleAnalysisService] 트리거 조건 미충족 — userId={}, completedCount={}",
                    userId, completedCount);
            return;
        }

        // ── 2. Redis 캐시 확인 (24h 자연 디바운스) ──────────────────────────
        String cacheKey = String.format(CACHE_KEY_AI_LIFESTYLE, userId);
        boolean alreadyAnalyzed = cacheService.get(cacheKey, Object.class).isPresent();

        if (alreadyAnalyzed) {
            log.debug("[LifestyleAnalysisService] 24h 내 분석 기록 존재 — userId={}, 트리거 스킵", userId);
            return;
        }

        // ── 3. 최근 COMPLETED 일기 10편 조회 ────────────────────────────────
        List<Diary> recentDiaries = diaryRepository.findTopByUserIdAndAnalysisStatusOrderByDateDesc(
                userId, Diary.AnalysisStatus.COMPLETED, Pageable.ofSize(RECENT_DIARY_LIMIT));

        if (recentDiaries.isEmpty()) {
            log.warn("[LifestyleAnalysisService] COMPLETED 일기 조회 결과 없음 (count와 불일치) — userId={}", userId);
            return;
        }

        // ── 4. OutboxEvent 구성 및 저장 ─────────────────────────────────────
        try {
            LifestyleAnalyzeRequestedEvent requestEvent = buildEvent(userId, recentDiaries);
            String payload = objectMapper.writeValueAsString(requestEvent);

            OutboxEvent outboxEvent = OutboxEvent.of(
                    "USER",
                    userId,
                    "LIFESTYLE_ANALYZE_REQUESTED",
                    payload
            );
            outboxEventRepository.save(outboxEvent);

            log.info("[LifestyleAnalysisService] 라이프스타일 분석 OutboxEvent 생성 완료 — userId={}, diaryCount={}",
                    userId, recentDiaries.size());

        } catch (JsonProcessingException e) {
            log.error("[LifestyleAnalysisService] OutboxEvent 직렬화 실패 — userId={}", userId, e);
        }
    }

    // -------------------------------------------------------------------------
    // private 헬퍼
    // -------------------------------------------------------------------------

    /**
     * 일기 목록으로 LifestyleAnalyzeRequestedEvent 구성.
     */
    private LifestyleAnalyzeRequestedEvent buildEvent(Long userId, List<Diary> diaries) {
        List<LifestyleAnalyzeRequestedEvent.DiaryPayload> payloads = diaries.stream()
                .map(d -> new LifestyleAnalyzeRequestedEvent.DiaryPayload(
                        d.getId(),
                        d.getContent(),
                        // date(LocalDate) → KST 자정 ISO-8601 문자열
                        ZonedDateTime.of(d.getDate().atStartOfDay(), KST)
                                .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                ))
                .toList();

        String publishedAt = ZonedDateTime.now(KST).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);

        return new LifestyleAnalyzeRequestedEvent(
                UUID.randomUUID().toString(),
                "v1",
                userId,
                payloads,
                publishedAt,
                null  // traceparent: M6에서는 미사용, 추후 OpenTelemetry 연동 시 주입
        );
    }
}
