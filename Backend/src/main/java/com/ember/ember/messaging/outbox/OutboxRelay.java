package com.ember.ember.messaging.outbox;

import com.ember.ember.aireport.repository.ExchangeReportRepository;
import com.ember.ember.consent.service.AiConsentService;
import com.ember.ember.diary.repository.DiaryRepository;
// 결정 4: ConsentType Enum 제거 — String 기반 사용
import com.ember.ember.messaging.event.DiaryAnalyzeRequestedEvent;
import com.ember.ember.messaging.event.ExchangeReportRequestedEvent;
import com.ember.ember.messaging.event.LifestyleAnalyzeRequestedEvent;
import com.ember.ember.messaging.event.UserVectorGenerateRequestedEvent;
import com.ember.ember.messaging.outbox.entity.OutboxEvent;
import com.ember.ember.messaging.outbox.entity.OutboxEvent.OutboxStatus;
import com.ember.ember.messaging.outbox.repository.OutboxEventRepository;
import com.ember.ember.messaging.publisher.AiMessagePublisher;
import com.ember.ember.observability.metric.AiMetrics;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Transactional Outbox Relay 스케줄러
 *
 * 동작 원리:
 *   1. 500ms 간격으로 outbox_events 테이블에서 PENDING 이벤트 최대 100건 조회
 *      (PESSIMISTIC_WRITE + SKIP LOCKED로 다중 인스턴스 중복 방지)
 *   2. DIARY_ANALYZE_REQUESTED 이벤트: AI 동의 확인 후 조건부 발행
 *      - 동의(GRANTED) → AiMessagePublisher로 발행, status=PROCESSED
 *      - 미동의 → diary.analysisStatus=SKIPPED, status=PROCESSED (발행 생략)
 *   3. 기타 이벤트 타입은 no-op (M5/M6에서 처리 추가 예정)
 *   4. 성공: status=PROCESSED, processed_at=현재시각
 *   5. 실패: retry_count++, 5회 초과 시 status=FAILED
 *
 * 멱등성:
 *   Consumer 측 멱등성은 ProcessedMessage(PK 충돌)로 보장.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OutboxRelay {

    private static final int MAX_RETRY = 5;

    private final OutboxEventRepository outboxEventRepository;
    private final AiMessagePublisher aiMessagePublisher;
    private final AiConsentService aiConsentService;
    private final DiaryRepository diaryRepository;
    private final ExchangeReportRepository exchangeReportRepository;
    private final ObjectMapper objectMapper;
    private final AiMetrics aiMetrics;

    /**
     * 애플리케이션 시작 시 OutboxRelayLag 게이지 등록.
     * 가장 오래된 PENDING 이벤트의 createdAt과 현재 시각의 차이(초)를 반환.
     * PENDING 이벤트가 없으면 0.0 반환.
     */
    @PostConstruct
    public void registerRelayLagGauge() {
        aiMetrics.outboxRelayLag(() -> {
            LocalDateTime oldest = outboxEventRepository
                    .findOldestCreatedAtByStatus(OutboxStatus.PENDING)
                    .orElse(null);
            if (oldest == null) {
                return 0.0;
            }
            return (double) Duration.between(oldest, LocalDateTime.now()).toSeconds();
        });
    }

    /**
     * 500ms 간격으로 PENDING 이벤트 릴레이.
     * fixedDelay: 이전 실행이 끝난 후 500ms 대기 (적체 시 추월 방지).
     */
    @Scheduled(fixedDelay = 500)
    public void relay() {
        List<OutboxEvent> pendingEvents =
                outboxEventRepository.findTop100ByStatusOrderByCreatedAt(OutboxStatus.PENDING);

        if (pendingEvents.isEmpty()) {
            return;
        }

        log.debug("[OutboxRelay] PENDING 이벤트 {}건 처리 시작", pendingEvents.size());

        for (OutboxEvent event : pendingEvents) {
            processEvent(event);
        }
    }

    /**
     * 단일 이벤트 처리.
     * 각 이벤트마다 독립 트랜잭션 → 한 이벤트 실패가 다른 이벤트에 영향 없음.
     * MDC에 outboxEventId를 주입해 로그 상관 추적을 지원한다.
     */
    @Transactional
    public void processEvent(OutboxEvent event) {
        // MDC 컨텍스트에 outboxEventId 주입 — 구조화 로그 상관 추적
        MDC.put("outboxEventId", String.valueOf(event.getId()));
        MDC.put("eventType", event.getEventType());
        try {
            switch (event.getEventType()) {
                case "DIARY_ANALYZE_REQUESTED"         -> processDiaryAnalyzeRequested(event);
                case "EXCHANGE_REPORT_REQUESTED"       -> processExchangeReportRequested(event);
                case "LIFESTYLE_ANALYZE_REQUESTED"     -> processLifestyleAnalyzeRequested(event);
                case "USER_VECTOR_GENERATE_REQUESTED"  -> processUserVectorGenerateRequested(event);
                default -> {
                    log.debug("[OutboxRelay] 처리 대상 아닌 이벤트 타입 — eventType={}, eventId={}",
                            event.getEventType(), event.getId());
                    event.markProcessed();
                    outboxEventRepository.save(event);
                }
            }
        } catch (Exception e) {
            event.incrementRetryOrFail(MAX_RETRY);
            outboxEventRepository.save(event);
            log.warn("[OutboxRelay] 발행 실패 — eventId={}, retry={}, 이유={}",
                    event.getId(), event.getRetryCount(), e.getMessage());
        } finally {
            // 이벤트 처리 완료 후 MDC 정리
            MDC.remove("outboxEventId");
            MDC.remove("eventType");
        }
    }

    /**
     * EXCHANGE_REPORT_REQUESTED 이벤트 처리.
     *
     * 안전 재검증:
     *   OutboxRelay 처리 시점에 동의 상태가 변경될 수 있으므로 2-party 동의를 한 번 더 확인.
     *   미동의 시 ExchangeReport.status=CONSENT_REQUIRED로 업데이트 후 Outbox PROCESSED 처리 (발행 생략).
     *   양측 동의 시 AiMessagePublisher로 발행.
     */
    private void processExchangeReportRequested(OutboxEvent event) throws Exception {
        // payload JSON → ExchangeReportRequestedEvent 역직렬화
        ExchangeReportRequestedEvent requestEvent = objectMapper.readValue(
                event.getPayload(), ExchangeReportRequestedEvent.class);

        Long reportId  = requestEvent.reportId();
        Long userAId   = requestEvent.userAId();
        Long userBId   = requestEvent.userBId();

        // 2-party 동의 재검증 (AI_DATA_USAGE)
        boolean consentA = aiConsentService.hasGrantedConsent(userAId, "AI_DATA_USAGE");
        boolean consentB = aiConsentService.hasGrantedConsent(userBId, "AI_DATA_USAGE");

        if (!consentA || !consentB) {
            // 재검증 미동의: 리포트 상태를 CONSENT_REQUIRED로 복구
            exchangeReportRepository.findById(reportId).ifPresent(report -> {
                report.markConsentRequired();
                exchangeReportRepository.save(report);
            });
            event.markProcessed();
            outboxEventRepository.save(event);
            log.info("[OutboxRelay] EXCHANGE_REPORT_REQUESTED — 재검증 동의 미획득, 발행 생략 " +
                     "reportId={}, consentA={}, consentB={}", reportId, consentA, consentB);
            return;
        }

        // 동의 확인: 메시지 발행
        aiMessagePublisher.publishExchangeReport(requestEvent);
        event.markProcessed();
        outboxEventRepository.save(event);
        log.debug("[OutboxRelay] EXCHANGE_REPORT_REQUESTED 발행 완료 — eventId={}, reportId={}",
                event.getId(), reportId);
    }

    /**
     * LIFESTYLE_ANALYZE_REQUESTED 이벤트 처리 (M6).
     *
     * AI_DATA_USAGE 동의 확인 후 조건부 발행.
     * 미동의 시 Outbox PROCESSED 처리 (발행 생략 — 다음 트리거 시 재시도 가능).
     */
    private void processLifestyleAnalyzeRequested(OutboxEvent event) throws Exception {
        LifestyleAnalyzeRequestedEvent requestEvent = objectMapper.readValue(
                event.getPayload(), LifestyleAnalyzeRequestedEvent.class);

        Long userId = requestEvent.userId();

        // AI_DATA_USAGE 동의 확인
        boolean hasConsent = aiConsentService.hasGrantedConsent(
                userId, "AI_DATA_USAGE");

        if (!hasConsent) {
            event.markProcessed();
            outboxEventRepository.save(event);
            log.info("[OutboxRelay] LIFESTYLE_ANALYZE_REQUESTED — AI_DATA_USAGE 동의 미획득, 발행 생략 userId={}",
                    userId);
            return;
        }

        aiMessagePublisher.publishLifestyleAnalyze(requestEvent);
        event.markProcessed();
        outboxEventRepository.save(event);
        log.debug("[OutboxRelay] LIFESTYLE_ANALYZE_REQUESTED 발행 완료 — eventId={}, userId={}",
                event.getId(), userId);
    }

    /**
     * USER_VECTOR_GENERATE_REQUESTED 이벤트 처리 (M6).
     *
     * 동의 체크 없이 무조건 발행
     * (MatchingService가 이미 사용자 요청 맥락에서 발행하므로 동의 전제됨).
     */
    private void processUserVectorGenerateRequested(OutboxEvent event) throws Exception {
        UserVectorGenerateRequestedEvent requestEvent = objectMapper.readValue(
                event.getPayload(), UserVectorGenerateRequestedEvent.class);

        aiMessagePublisher.publishUserVectorGenerate(requestEvent);
        event.markProcessed();
        outboxEventRepository.save(event);
        log.debug("[OutboxRelay] USER_VECTOR_GENERATE_REQUESTED 발행 완료 — eventId={}, userId={}",
                event.getId(), requestEvent.userId());
    }

    /**
     * DIARY_ANALYZE_REQUESTED 이벤트 처리.
     * AI_ANALYSIS 동의 여부 확인 후 조건부 발행.
     */
    private void processDiaryAnalyzeRequested(OutboxEvent event) throws Exception {
        // payload JSON → DiaryAnalyzeRequestedEvent 역직렬화
        DiaryAnalyzeRequestedEvent requestEvent = objectMapper.readValue(
                event.getPayload(), DiaryAnalyzeRequestedEvent.class);

        Long userId = requestEvent.userId();
        Long diaryId = requestEvent.diaryId();
        // messageId MDC 주입 — MQ 메시지와 로그를 상관시키는 데 사용
        MDC.put("messageId", requestEvent.messageId());

        // AI 분석 동의 여부 확인
        boolean hasConsent = aiConsentService.hasGrantedConsent(userId, "AI_ANALYSIS");

        if (!hasConsent) {
            // 동의 미획득: analysisStatus=SKIPPED, 발행 생략
            diaryRepository.findById(diaryId).ifPresent(diary -> {
                diary.skipAnalysis();
                diaryRepository.save(diary);
            });
            event.markProcessed();
            outboxEventRepository.save(event);
            log.info("[OutboxRelay] AI 동의 미획득 — 분석 생략 처리 diaryId={}, userId={}", diaryId, userId);
            return;
        }

        // 동의 있음: 메시지 발행
        aiMessagePublisher.publishDiaryAnalyze(requestEvent);
        event.markProcessed();
        outboxEventRepository.save(event);
        log.debug("[OutboxRelay] DIARY_ANALYZE_REQUESTED 발행 완료 — eventId={}, diaryId={}",
                event.getId(), diaryId);
    }
}
