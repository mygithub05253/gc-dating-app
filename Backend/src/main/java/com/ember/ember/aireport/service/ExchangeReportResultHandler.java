package com.ember.ember.aireport.service;

import com.ember.ember.aireport.domain.ExchangeReport;
import com.ember.ember.aireport.repository.ExchangeReportRepository;
import com.ember.ember.cache.service.CacheService;
import com.ember.ember.messaging.event.AiAnalysisResultEvent;
import com.ember.ember.messaging.event.AiAnalysisResultEvent.ExchangeResult;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.List;

/**
 * 교환일기 완주 리포트 AI 결과 처리 핸들러
 *
 * AiResultConsumer에서 EXCHANGE_REPORT_COMPLETED / EXCHANGE_REPORT_FAILED 타입 수신 시 호출.
 *
 * Redis 캐시 키 명명 결정:
 *   설계서 §5.2에 BRIEFING:{diaryId}라고 명시돼 있으나, 교환일기 리포트는
 *   room(교환방) 단위 결과이므로 diaryId 매핑이 불명확함.
 *   현재 구현: EXCHANGE_REPORT:{reportId} (TTL 24h) — reportId 기반 캐시 키 사용.
 *   TODO: 설계서 §5.2 키 패턴 재검토 후 BRIEFING 키 체계 통합 여부 결정 필요.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExchangeReportResultHandler {

    /** 교환일기 리포트 Redis 캐시 키 패턴 (reportId 기반) */
    private static final String CACHE_KEY_EXCHANGE_REPORT = "EXCHANGE_REPORT:%d";

    /** Redis 캐시 TTL: 24시간 */
    private static final Duration CACHE_TTL_24H = Duration.ofHours(24);

    private final ExchangeReportRepository exchangeReportRepository;
    private final CacheService cacheService;
    private final ObjectMapper objectMapper;

    /**
     * 교환일기 리포트 생성 완료 처리.
     *
     * 처리 순서:
     *   1. ExchangeReport 조회 (없으면 WARN 후 return)
     *   2. ExchangeResult 데이터 검증
     *   3. Exchange report 필드 업데이트 (status=COMPLETED, ai_description 등)
     *   4. Redis 캐시 저장 EXCHANGE_REPORT:{reportId} TTL 24h
     *   5. FCM 푸시 알림 — TODO(M7)
     *
     * @param event EXCHANGE_REPORT_COMPLETED 이벤트
     */
    @Transactional
    public void handleCompleted(AiAnalysisResultEvent event) {
        Long reportId = event.reportId();

        if (reportId == null) {
            log.warn("[ExchangeReportResultHandler] reportId 누락 — 처리 불가 messageId={}", event.messageId());
            return;
        }

        // 1. ExchangeReport 조회
        ExchangeReport report = exchangeReportRepository.findById(reportId).orElse(null);
        if (report == null) {
            log.warn("[ExchangeReportResultHandler] ExchangeReport 없음 — reportId={}", reportId);
            return;
        }

        // 2. ExchangeResult 데이터 검증
        ExchangeResult exchangeResult = event.exchangeResult();
        if (exchangeResult == null) {
            log.warn("[ExchangeReportResultHandler] exchangeResult 누락 — reportId={}", reportId);
            return;
        }

        // 3. 공통 키워드/생활패턴 JSON 직렬화 (LIST → TEXT 컬럼 저장)
        String commonKeywordsJson = toJson(exchangeResult.commonKeywords(), reportId, "commonKeywords");
        String lifestylePatternsJson = toJson(exchangeResult.lifestylePatterns(), reportId, "lifestylePatterns");

        BigDecimal emotionSimilarity = BigDecimal.valueOf(exchangeResult.emotionSimilarity())
                .setScale(3, RoundingMode.HALF_UP);
        BigDecimal writingTempA = BigDecimal.valueOf(exchangeResult.writingTempA())
                .setScale(3, RoundingMode.HALF_UP);
        BigDecimal writingTempB = BigDecimal.valueOf(exchangeResult.writingTempB())
                .setScale(3, RoundingMode.HALF_UP);

        // 4. ExchangeReport 필드 업데이트 (status=COMPLETED)
        report.completeReport(
                commonKeywordsJson,
                emotionSimilarity,
                lifestylePatternsJson,
                writingTempA,
                writingTempB,
                exchangeResult.aiDescription()
        );
        exchangeReportRepository.save(report);

        // 5. Redis 캐시 저장: EXCHANGE_REPORT:{reportId} TTL 24h
        //    TODO: 설계서 §5.2 BRIEFING 키 체계와 통합 여부 재검토 필요
        String cacheKey = String.format(CACHE_KEY_EXCHANGE_REPORT, reportId);
        cacheService.set(cacheKey, exchangeResult, CACHE_TTL_24H);

        log.info("[ExchangeReportResultHandler] 리포트 완료 처리 성공 — reportId={}, roomId={}, " +
                 "emotionSimilarity={}, writingTempA={}, writingTempB={}",
                reportId, event.roomId(), emotionSimilarity, writingTempA, writingTempB);

        // 6. FCM 푸시 알림 — TODO(M7): 양측 사용자에게 리포트 완성 알림 발송
        //    FcmService.sendToUser(report.getRoom().getUserA().getId(), "교환일기 리포트가 완성됐어요!");
        //    FcmService.sendToUser(report.getRoom().getUserB().getId(), "교환일기 리포트가 완성됐어요!");
    }

    /**
     * 교환일기 리포트 생성 실패 처리.
     *
     * 처리 순서:
     *   1. ExchangeReport 조회 (없으면 WARN 후 return)
     *   2. status=FAILED 업데이트
     *   3. 관리자 알림 — TODO(M7)
     *
     * @param event EXCHANGE_REPORT_FAILED 이벤트
     */
    @Transactional
    public void handleFailed(AiAnalysisResultEvent event) {
        Long reportId = event.reportId();

        if (reportId == null) {
            log.warn("[ExchangeReportResultHandler] reportId 누락 (실패 이벤트) — messageId={}", event.messageId());
            return;
        }

        exchangeReportRepository.findById(reportId).ifPresentOrElse(
                report -> {
                    report.failReport();
                    exchangeReportRepository.save(report);
                    log.warn("[ExchangeReportResultHandler] 리포트 생성 실패 처리 — reportId={}, roomId={}",
                            reportId, event.roomId());
                },
                () -> log.warn("[ExchangeReportResultHandler] ExchangeReport 없음 (실패 처리) — reportId={}", reportId)
        );

        // TODO(M7): 관리자 알림 — reportId 기준 DLQ 소진 후 Slack/이메일 알림 발송
    }

    // -------------------------------------------------------------------------
    // private 헬퍼
    // -------------------------------------------------------------------------

    /**
     * List<String>을 JSON 배열 문자열로 직렬화.
     * 직렬화 실패 시 WARN 로그 + null 반환 (컬럼 저장 생략 허용).
     */
    private String toJson(List<String> list, Long reportId, String fieldName) {
        if (list == null || list.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            log.warn("[ExchangeReportResultHandler] {} 직렬화 실패 — reportId={}", fieldName, reportId);
            return null;
        }
    }
}
